import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, In } from 'typeorm';
import { Employee } from 'src/employee/entities/employee.entity';
import { EMPLOYEE_PERMISSION } from 'src/employee/constants/employee-permission.constant';
import { mergeEmployeePermissions } from 'src/utils/employee-permissions.helper';
import { NOTIFICATION_TYPE } from 'src/notification/constants/notification-type.constant';
import { MisaSaOrder } from '../entities/misa-sa-order.entity';
import { MisaSaOrderWorkflowHistory, WORKFLOW_ACTION } from '../entities/misa-sa-order-workflow-history.entity';
import {
  MisaSaOrderAssignment,
  ASSIGNMENT_STATUS,
  ASSIGNMENT_STATUS_LABELS,
  TASK_TYPE,
  TASK_TYPE_LABELS,
} from '../entities/misa-sa-order-assignment.entity';
import {
  MisaSaOrderTaskReport,
  REPORT_TYPE,
  REPORT_STATUS,
} from '../entities/misa-sa-order-task-report.entity';
import { MisaNotificationHelper } from './misa-notification.helper';
import {
  getWorkflowStep,
  getNextWorkflowStep,
  isLastWorkflowStep,
  getAllTaskTypesInPhase,
  WORKFLOW_STEPS,
} from '../constants/workflow.constant';

/**
 * Service quản lý giao việc và báo cáo công việc cho đơn hàng
 */
@Injectable()
export class MisaAssignmentService {
  private readonly logger = new Logger(MisaAssignmentService.name);

  constructor(
    @InjectRepository(MisaSaOrder)
    private readonly saOrderRepository: Repository<MisaSaOrder>,
    @InjectRepository(MisaSaOrderAssignment)
    private readonly assignmentRepository: Repository<MisaSaOrderAssignment>,
    @InjectRepository(MisaSaOrderTaskReport)
    private readonly taskReportRepository: Repository<MisaSaOrderTaskReport>,
    @InjectRepository(MisaSaOrderWorkflowHistory)
    private readonly workflowHistoryRepository: Repository<MisaSaOrderWorkflowHistory>,
    @InjectRepository(Employee)
    private readonly employeeRepository: Repository<Employee>,
    private readonly notificationHelper: MisaNotificationHelper,
  ) {}

  /**
   * Lấy tên hiển thị của employee
   */
  private getEmployeeName(employee: Employee): string {
    return employee.user?.fullName || employee.user?.email || `NV #${employee.id}`;
  }

  /**
   * Kiểm tra xem employee có thuộc cùng nhóm công việc không
   * (cùng orderId + taskType với assignment được chỉ định)
   */
  private async isGroupMember(
    assignment: MisaSaOrderAssignment,
    employeeId: number
  ): Promise<boolean> {
    // Nếu chính là người được giao → OK
    if (assignment.assignedToId === employeeId) {
      return true;
    }

    // Kiểm tra xem employee có assignment nào cùng orderId + taskType không
    const sameGroupAssignment = await this.assignmentRepository.findOne({
      where: {
        orderId: assignment.orderId,
        taskType: assignment.taskType,
        assignedToId: employeeId,
        deletedAt: IsNull(),
      },
    });

    return !!sameGroupAssignment;
  }

  /**
   * Kiểm tra xem tất cả task song song trong giai đoạn có hoàn thành chưa
   * Mỗi taskType chỉ cần có ÍT NHẤT 1 người hoàn thành là được tính là xong
   * VD: warehouse_export có 1/2 người xong, technical_check có 1/2 người xong → OK, chuyển sang delivery
   */
  private async areAllParallelTasksCompleted(
    orderId: number,
    taskType: string
  ): Promise<boolean> {
    const allTaskTypes = getAllTaskTypesInPhase(taskType);
    this.logger.log(`[areAllParallelTasksCompleted] orderId=${orderId}, taskType=${taskType}, allTaskTypes=${allTaskTypes.join(',')}`);

    // Nếu không có task song song, return true
    if (allTaskTypes.length <= 1) {
      this.logger.log(`[areAllParallelTasksCompleted] Không có task song song, return true`);
      return true;
    }

    // Lấy tất cả assignments của các taskType song song
    for (const tt of allTaskTypes) {
      const assignments = await this.assignmentRepository.find({
        where: {
          orderId,
          taskType: tt,
          deletedAt: IsNull(),
        },
      });

      this.logger.log(`[areAllParallelTasksCompleted] Task ${tt}: ${assignments.length} assignments, statuses=[${assignments.map(a => `${a.id}:${a.status}`).join(', ')}]`);

      // Nếu không có assignment nào cho taskType này → coi như chưa hoàn thành (chưa giao)
      if (assignments.length === 0) {
        this.logger.log(`[areAllParallelTasksCompleted] Task ${tt} chưa có assignment nào -> return false`);
        return false;
      }

      // Chỉ cần ÍT NHẤT 1 assignment đã completed là OK
      const hasAnyCompleted = assignments.some(a => a.status === ASSIGNMENT_STATUS.COMPLETED);
      if (!hasAnyCompleted) {
        this.logger.log(`[areAllParallelTasksCompleted] Task ${tt} chưa có ai hoàn thành -> return false`);
        return false;
      }
    }

    this.logger.log(`[areAllParallelTasksCompleted] Tất cả task song song đã có người hoàn thành -> return true`);
    return true;
  }

  /**
   * Ghi lịch sử workflow
   */
  private async recordWorkflowHistory(data: {
    orderId: number;
    action: string;
    fromStatus?: string | null;
    toStatus?: string | null;
    performedByEmployeeId: number;
    performedByName?: string | null;
    notes?: string | null;
    metadata?: Record<string, any> | null;
  }): Promise<MisaSaOrderWorkflowHistory> {
    const history = this.workflowHistoryRepository.create({
      orderId: data.orderId,
      action: data.action,
      fromStatus: data.fromStatus || null,
      toStatus: data.toStatus || null,
      performedByEmployeeId: data.performedByEmployeeId,
      performedByName: data.performedByName || null,
      performedAt: new Date(),
      notes: data.notes || null,
      metadata: data.metadata || null,
    });

    return this.workflowHistoryRepository.save(history);
  }

  /**
   * Giao việc cho đơn hàng
   */
  async createAssignment(data: {
    orderId: number;
    taskType: string;
    assignedToId: number;
    assignedById: number;
    scheduledAt?: Date;
    notes?: string;
  }): Promise<{ success: boolean; message: string; assignment?: MisaSaOrderAssignment }> {
    try {
      // Kiểm tra đơn hàng tồn tại
      const order = await this.saOrderRepository.findOne({
        where: { id: data.orderId, deletedAt: IsNull() },
      });

      if (!order) {
        return { success: false, message: 'Đơn hàng không tồn tại' };
      }

      // Kiểm tra người được giao tồn tại
      const assignedTo = await this.employeeRepository.findOne({
        where: { id: data.assignedToId, deletedAt: IsNull() },
        relations: ['user'],
      });

      if (!assignedTo) {
        return { success: false, message: 'Nhân viên được giao không tồn tại' };
      }

      // Lấy thông tin người giao việc
      const assignedBy = await this.employeeRepository.findOne({
        where: { id: data.assignedById, deletedAt: IsNull() },
        relations: ['user'],
      });

      if (!assignedBy) {
        return { success: false, message: 'Nhân viên giao việc không tồn tại' };
      }

      const assignedByName = this.getEmployeeName(assignedBy);
      const assignedToName = this.getEmployeeName(assignedTo);

      // Kiểm tra xem nhân viên đã được giao việc cùng taskType chưa (PENDING hoặc IN_PROGRESS)
      const existingAssignment = await this.assignmentRepository.findOne({
        where: {
          orderId: data.orderId,
          taskType: data.taskType,
          assignedToId: data.assignedToId,
          status: In([ASSIGNMENT_STATUS.PENDING, ASSIGNMENT_STATUS.IN_PROGRESS]),
          deletedAt: IsNull(),
        },
      });

      if (existingAssignment) {
        return {
          success: false,
          message: `${assignedToName} đã được giao việc "${TASK_TYPE_LABELS[data.taskType] || data.taskType}" cho đơn hàng này rồi`,
        };
      }

      // Tạo assignment
      const assignment = this.assignmentRepository.create({
        orderId: data.orderId,
        taskType: data.taskType,
        assignedToId: data.assignedToId,
        assignedToName,
        assignedById: data.assignedById,
        assignedByName,
        assignedAt: new Date(),
        scheduledAt: data.scheduledAt || null,
        status: ASSIGNMENT_STATUS.PENDING,
        notes: data.notes || null,
      });

      await this.assignmentRepository.save(assignment);

      // Cập nhật trạng thái đơn hàng dựa trên workflow step
      const workflowStep = getWorkflowStep(data.taskType);
      let newStatus = order.orderWorkflowStatus;

      if (workflowStep && order.orderWorkflowStatus === workflowStep.waitingStatus) {
        // Chuyển từ waiting_xxx sang in_xxx (đang thực hiện)
        newStatus = workflowStep.inProgressStatus;
        await this.saOrderRepository.update(order.id, {
          orderWorkflowStatus: newStatus,
          // Cập nhật ngày xuất kho thực tế nếu là xuất kho
          ...(data.taskType === TASK_TYPE.WAREHOUSE_EXPORT ? { actualExportDate: new Date() } : {}),
        });
      }

      // Ghi lịch sử workflow
      await this.recordWorkflowHistory({
        orderId: data.orderId,
        action: WORKFLOW_ACTION.ASSIGN_TASK,
        fromStatus: order.orderWorkflowStatus,
        toStatus: newStatus,
        performedByEmployeeId: data.assignedById,
        performedByName: assignedByName,
        notes: data.notes,
        metadata: {
          taskType: data.taskType,
          taskTypeLabel: TASK_TYPE_LABELS[data.taskType] || data.taskType,
          assignedToId: data.assignedToId,
          assignedToName,
          scheduledAt: data.scheduledAt,
        },
      });

      // Gửi thông báo cho người được giao việc
      await this.notificationHelper.notifyAssignedEmployee(order, assignment, assignedTo, assignedByName);

      // Gửi thông báo cho workflow subscribers và Sale Admin
      const updatedOrder = await this.saOrderRepository.findOne({ where: { id: data.orderId } });
      if (updatedOrder) {
        await this.notificationHelper.notifyWorkflowSubscribersAboutAssignment(
          updatedOrder,
          assignment,
          assignedByName,
          assignedToName
        );
      }

      return {
        success: true,
        message: `Giao việc ${TASK_TYPE_LABELS[data.taskType] || data.taskType} thành công`,
        assignment,
      };
    } catch (error: any) {
      this.logger.error(`Lỗi giao việc: ${error.message}`);
      return { success: false, message: `Lỗi: ${error.message}` };
    }
  }

  /**
   * Lấy danh sách assignments của đơn hàng
   */
  async getAssignmentsByOrderId(orderId: number): Promise<MisaSaOrderAssignment[]> {
    return this.assignmentRepository.find({
      where: { orderId, deletedAt: IsNull() },
      order: { assignedAt: 'DESC' },
      relations: ['assignedTo', 'assignedBy'],
    });
  }

  /**
   * Lấy thông tin assignment theo ID
   */
  async getAssignmentById(id: number): Promise<MisaSaOrderAssignment | null> {
    return this.assignmentRepository.findOne({
      where: { id, deletedAt: IsNull() },
      relations: ['assignedTo', 'assignedBy', 'order'],
    });
  }

  /**
   * Bắt đầu thực hiện công việc
   */
  async startAssignment(
    assignmentId: number,
    employeeId: number
  ): Promise<{ success: boolean; message: string; assignment?: MisaSaOrderAssignment; assignments?: MisaSaOrderAssignment[] }> {
    try {
      const assignment = await this.assignmentRepository.findOne({
        where: { id: assignmentId, deletedAt: IsNull() },
        relations: ['order'],
      });

      if (!assignment) {
        return { success: false, message: 'Công việc không tồn tại' };
      }

      if (assignment.assignedToId !== employeeId) {
        return { success: false, message: 'Bạn không được giao công việc này' };
      }

      if (assignment.status !== ASSIGNMENT_STATUS.PENDING) {
        return { success: false, message: `Công việc đang ở trạng thái "${assignment.status}", không thể bắt đầu` };
      }

      const orderId = assignment.orderId;

      // Lấy tất cả assignments của order (dùng cho cả check điều kiện + trả về frontend)
      const allAssignments = await this.getAssignmentsByOrderId(orderId);

      // Kiểm tra điều kiện phụ thuộc: technical_check chỉ được bắt đầu khi warehouse_export đã có người hoàn thành
      if (assignment.taskType === TASK_TYPE.TECHNICAL_CHECK) {
        const hasWarehouseCompleted = allAssignments.some(
          a => a.taskType === TASK_TYPE.WAREHOUSE_EXPORT && a.status === ASSIGNMENT_STATUS.COMPLETED
        );

        if (!hasWarehouseCompleted) {
          return {
            success: false,
            message: 'Chưa thể bắt đầu Kiểm tra kỹ thuật. Cần chờ Kho xuất máy hoàn thành trước.',
          };
        }
      }

      const now = new Date();

      // Lấy tất cả assignments PENDING cùng taskType trong order để bắt đầu cùng lúc
      const pendingAssignmentsInGroup = allAssignments.filter(
        a => a.taskType === assignment.taskType && a.status === ASSIGNMENT_STATUS.PENDING
      );

      // Cập nhật tất cả thành IN_PROGRESS
      const assignmentIdsToStart = pendingAssignmentsInGroup.map(a => a.id);
      if (assignmentIdsToStart.length > 0) {
        await this.assignmentRepository
          .createQueryBuilder()
          .update()
          .set({ status: ASSIGNMENT_STATUS.IN_PROGRESS, startedAt: now })
          .whereInIds(assignmentIdsToStart)
          .execute();
      }

      // Cập nhật lại trong list để trả về frontend
      for (const a of allAssignments) {
        if (assignmentIdsToStart.includes(a.id)) {
          a.status = ASSIGNMENT_STATUS.IN_PROGRESS;
          a.startedAt = now;
        }
      }

      // Lấy thông tin employee để gửi thông báo
      const employee = await this.employeeRepository.findOne({
        where: { id: employeeId },
        relations: ['user'],
      });
      const employeeName = employee ? this.getEmployeeName(employee) : `NV #${employeeId}`;

      // Gửi thông báo cho stakeholders
      const order = assignment.order || await this.saOrderRepository.findOne({ where: { id: orderId } });
      if (order) {
        await this.notificationHelper.notifyWorkflowSubscribersAboutTaskStart(
          order,
          assignment,
          employeeName
        );

        // Gửi thông báo cho các nhân viên khác trong nhóm (trừ người bấm start)
        const otherAssignments = pendingAssignmentsInGroup.filter(a => a.assignedToId !== employeeId);
        for (const otherAssignment of otherAssignments) {
          const otherEmployee = await this.employeeRepository.findOne({
            where: { id: otherAssignment.assignedToId },
            relations: ['user'],
          });
          if (otherEmployee?.userId) {
            const taskTypeLabel = TASK_TYPE_LABELS[assignment.taskType] || assignment.taskType;
            await this.notificationHelper.sendBatchNotifications(
              [otherEmployee],
              `Công việc đã bắt đầu: ${taskTypeLabel}`,
              `${employeeName} đã bắt đầu công việc "${taskTypeLabel}".\nĐơn hàng: ${order.refNo}\nTất cả nhân viên trong nhóm cũng được chuyển sang trạng thái đang thực hiện.\nNhấn để xem chi tiết`,
              NOTIFICATION_TYPE.MISA_SA_ORDER_TASK_ASSIGNED,
              order.id,
              {
                orderId: order.id,
                refNo: order.refNo,
                taskType: assignment.taskType,
                assignmentId: otherAssignment.id,
                startedByEmployeeId: employeeId,
                startedByName: employeeName,
              }
            );
          }
        }
      }

      const startedCount = assignmentIdsToStart.length;
      return {
        success: true,
        message: startedCount > 1
          ? `Đã bắt đầu công việc cho ${startedCount} người trong nhóm`
          : 'Bắt đầu thực hiện công việc',
        assignment: allAssignments.find(a => a.id === assignmentId),
        assignments: allAssignments,
      };
    } catch (error: any) {
      this.logger.error(`Lỗi bắt đầu công việc: ${error.message}`);
      return { success: false, message: `Lỗi: ${error.message}` };
    }
  }

  /**
   * Hoàn thành công việc
   */
  async completeAssignment(
    assignmentId: number,
    employeeId: number,
    data: {
      completionNotes?: string;
      attachments?: string[];
    }
  ): Promise<{ success: boolean; message: string; assignment?: MisaSaOrderAssignment; assignments?: MisaSaOrderAssignment[] }> {
    try {
      const assignment = await this.assignmentRepository.findOne({
        where: { id: assignmentId, deletedAt: IsNull() },
        relations: ['order'],
      });
      if (!assignment) {
        return { success: false, message: 'Công việc không tồn tại' };
      }

      // Kiểm tra quyền: phải là người được giao HOẶC thành viên cùng nhóm
      const isMember = await this.isGroupMember(assignment, employeeId);
      if (!isMember) {
        return { success: false, message: 'Bạn không có quyền thao tác công việc này' };
      }

      if (assignment.status === ASSIGNMENT_STATUS.COMPLETED) {
        return { success: false, message: 'Công việc đã hoàn thành trước đó' };
      }

      const employee = await this.employeeRepository.findOne({
        where: { id: employeeId },
        relations: ['user'],
      });
      const employeeName = employee ? this.getEmployeeName(employee) : `NV #${employeeId}`;
      const orderId = assignment.orderId;
      const now = new Date();

      // Lấy tất cả assignments IN_PROGRESS cùng taskType để hoàn thành cùng lúc
      const allAssignments = await this.getAssignmentsByOrderId(orderId);
      const inProgressAssignmentsInGroup = allAssignments.filter(
        a => a.taskType === assignment.taskType &&
          (a.status === ASSIGNMENT_STATUS.IN_PROGRESS || a.status === ASSIGNMENT_STATUS.PENDING)
      );

      // Cập nhật tất cả thành COMPLETED
      const assignmentIdsToComplete = inProgressAssignmentsInGroup.map(a => a.id);
      if (assignmentIdsToComplete.length > 0) {
        await this.assignmentRepository
          .createQueryBuilder()
          .update()
          .set({
            status: ASSIGNMENT_STATUS.COMPLETED,
            completedAt: now,
            completionNotes: data.completionNotes || null,
            attachments: data.attachments || null,
          })
          .whereInIds(assignmentIdsToComplete)
          .execute();

        // Cập nhật startedAt cho những assignment chưa có
        await this.assignmentRepository
          .createQueryBuilder()
          .update()
          .set({ startedAt: now })
          .whereInIds(assignmentIdsToComplete)
          .andWhere('startedAt IS NULL')
          .execute();
      }

      // Tạo 1 báo cáo hoàn thành chung cho cả nhóm (chỉ link với assignment gốc)
      await this.taskReportRepository.save({
        assignmentId: assignmentId, // Link với assignment mà người dùng đang thao tác
        orderId: assignment.orderId,
        reportedById: employeeId,
        reportedByName: employeeName,
        reportDate: new Date(),
        reportType: REPORT_TYPE.COMPLETION,
        status: REPORT_STATUS.COMPLETED,
        progressPercent: 100,
        description: data.completionNotes || 'Hoàn thành công việc',
        attachments: data.attachments || null,
      });

      // Cập nhật lại trong list để trả về frontend
      for (const a of allAssignments) {
        if (assignmentIdsToComplete.includes(a.id)) {
          a.status = ASSIGNMENT_STATUS.COMPLETED;
          a.completedAt = now;
          a.completionNotes = data.completionNotes || null;
        }
      }

      // Lấy thông tin đơn hàng và cập nhật trạng thái
      const order = await this.saOrderRepository.findOne({ where: { id: assignment.orderId } });

      let newOrderStatus = order?.orderWorkflowStatus;
      let nextStepInfo: { label: string; taskType: string } | null = null;

      if (order) {
        const currentStep = getWorkflowStep(assignment.taskType);
        const nextStep = getNextWorkflowStep(assignment.taskType);
        const isLast = isLastWorkflowStep(assignment.taskType);

        this.logger.log(`[completeAssignment] orderId=${orderId}, taskType=${assignment.taskType}`);
        this.logger.log(`[completeAssignment] orderStatus=${order.orderWorkflowStatus}, expectedInProgressStatus=${currentStep?.inProgressStatus}`);

        if (currentStep && order.orderWorkflowStatus === currentStep.inProgressStatus) {
          // Kiểm tra xem TẤT CẢ task song song trong giai đoạn đã hoàn thành chưa
          // VD: warehouse_export và technical_check cần hoàn thành hết mới chuyển sang delivery
          const allParallelCompleted = await this.areAllParallelTasksCompleted(orderId, assignment.taskType);

          this.logger.log(`[completeAssignment] allParallelCompleted=${allParallelCompleted}`);

          if (allParallelCompleted) {
            // Chuyển sang trạng thái tiếp theo
            newOrderStatus = currentStep.nextWaitingStatus;
            this.logger.log(`[completeAssignment] CHUYỂN TRẠNG THÁI: ${order.orderWorkflowStatus} -> ${newOrderStatus}`);
            await this.saOrderRepository.update(order.id, {
              orderWorkflowStatus: newOrderStatus,
            });

            if (nextStep) {
              nextStepInfo = { label: nextStep.label, taskType: nextStep.taskType };
            }
          } else {
            this.logger.log(`[completeAssignment] KHÔNG chuyển trạng thái - còn task song song chưa hoàn thành`);
          }
        } else {
          this.logger.log(`[completeAssignment] SKIP - điều kiện không thỏa: currentStep=${!!currentStep}, statusMatch=${order.orderWorkflowStatus === currentStep?.inProgressStatus}`);
        }
      }

      // Ghi lịch sử workflow
      await this.recordWorkflowHistory({
        orderId: assignment.orderId,
        action: WORKFLOW_ACTION.COMPLETE_TASK,
        fromStatus: order?.orderWorkflowStatus,
        toStatus: newOrderStatus,
        performedByEmployeeId: employeeId,
        performedByName: employeeName,
        notes: data.completionNotes,
        metadata: {
          taskType: assignment.taskType,
          taskTypeLabel: TASK_TYPE_LABELS[assignment.taskType] || assignment.taskType,
          assignmentId,
          attachments: data.attachments,
          nextStep: nextStepInfo,
        },
      });

      // Gửi thông báo
      if (order) {
        // Thông báo hoàn thành công việc
        await this.notificationHelper.notifyWorkflowSubscribersAboutTaskCompletion(order, assignment, employeeName, true);

        const updatedOrder = await this.saOrderRepository.findOne({ where: { id: assignment.orderId } });

        // Nếu có bước tiếp theo, thông báo cho quản lý để giao việc
        if (nextStepInfo && updatedOrder) {
          await this.notificationHelper.notifyNextStepReady(
            updatedOrder,
            nextStepInfo.label,
            TASK_TYPE_LABELS[assignment.taskType] || assignment.taskType,
            employeeName
          );
        }

        // Nếu là bước cuối, thông báo chờ xác nhận hoàn tất
        if (isLastWorkflowStep(assignment.taskType) && updatedOrder) {
          await this.notificationHelper.notifyPendingCompletion(updatedOrder, employeeName);
        }
      }

      // Lấy lại tất cả assignments của order để trả về cho frontend (sau khi đã update)
      const refreshedAssignments = await this.getAssignmentsByOrderId(orderId);
      const updatedAssignment = refreshedAssignments.find(a => a.id === assignmentId);

      // Tạo message phù hợp
      let successMessage = 'Hoàn thành công việc thành công';
      if (nextStepInfo) {
        successMessage = `Hoàn thành công việc. Đơn hàng đã sẵn sàng để ${nextStepInfo.label.toLowerCase()}.`;
      } else if (isLastWorkflowStep(assignment.taskType)) {
        successMessage = 'Hoàn thành công việc. Đơn hàng đang chờ xác nhận hoàn tất.';
      } else if (!nextStepInfo && order) {
        // Kiểm tra còn task song song nào chưa hoàn thành không
        const allParallelCompleted = await this.areAllParallelTasksCompleted(orderId, assignment.taskType);
        if (!allParallelCompleted) {
          const allTaskTypes = getAllTaskTypesInPhase(assignment.taskType);
          const otherTasks = allTaskTypes.filter(t => t !== assignment.taskType);
          const otherTaskLabels = otherTasks.map(t => TASK_TYPE_LABELS[t] || t).join(', ');
          successMessage = `Hoàn thành công việc. Cần chờ hoàn thành: ${otherTaskLabels}`;
        }
      }

      return {
        success: true,
        message: successMessage,
        assignment: updatedAssignment,
        assignments: refreshedAssignments,
      };
    } catch (error: any) {
      this.logger.error(`Lỗi hoàn thành công việc: ${error.message}`);
      return { success: false, message: `Lỗi: ${error.message}` };
    }
  }

  /**
   * Báo chưa hoàn thành công việc
   */
  async markAssignmentIncomplete(
    assignmentId: number,
    employeeId: number,
    data: {
      incompleteReason: string;
      attachments?: string[];
    }
  ): Promise<{ success: boolean; message: string; assignment?: MisaSaOrderAssignment; assignments?: MisaSaOrderAssignment[] }> {
    try {
      if (!data.incompleteReason?.trim()) {
        return { success: false, message: 'Vui lòng nhập lý do chưa hoàn thành' };
      }

      const assignment = await this.assignmentRepository.findOne({
        where: { id: assignmentId, deletedAt: IsNull() },
        relations: ['order'],
      });

      if (!assignment) {
        return { success: false, message: 'Công việc không tồn tại' };
      }

      // Kiểm tra quyền: phải là người được giao HOẶC thành viên cùng nhóm
      const isMember = await this.isGroupMember(assignment, employeeId);
      if (!isMember) {
        return { success: false, message: 'Bạn không có quyền thao tác công việc này' };
      }

      const employee = await this.employeeRepository.findOne({
        where: { id: employeeId },
        relations: ['user'],
      });
      const employeeName = employee ? this.getEmployeeName(employee) : `NV #${employeeId}`;
      const orderId = assignment.orderId;

      // Lấy tất cả assignments IN_PROGRESS hoặc PENDING cùng taskType để đánh dấu incomplete cùng lúc
      const allAssignments = await this.getAssignmentsByOrderId(orderId);
      const inProgressAssignmentsInGroup = allAssignments.filter(
        a => a.taskType === assignment.taskType &&
          (a.status === ASSIGNMENT_STATUS.IN_PROGRESS || a.status === ASSIGNMENT_STATUS.PENDING)
      );

      // Cập nhật tất cả thành INCOMPLETE
      const assignmentIdsToMark = inProgressAssignmentsInGroup.map(a => a.id);
      if (assignmentIdsToMark.length > 0) {
        await this.assignmentRepository
          .createQueryBuilder()
          .update()
          .set({
            status: ASSIGNMENT_STATUS.INCOMPLETE,
            incompleteReason: data.incompleteReason,
            attachments: data.attachments || null,
          })
          .whereInIds(assignmentIdsToMark)
          .execute();
      }

      // Tạo 1 báo cáo chưa hoàn thành chung cho cả nhóm (chỉ link với assignment gốc)
      await this.taskReportRepository.save({
        assignmentId: assignmentId, // Link với assignment mà người dùng đang thao tác
        orderId,
        reportedById: employeeId,
        reportedByName: employeeName,
        reportDate: new Date(),
        reportType: REPORT_TYPE.ISSUE,
        status: REPORT_STATUS.INCOMPLETE,
        description: data.incompleteReason,
        blockedReason: data.incompleteReason,
        attachments: data.attachments || null,
      });

      // Cập nhật lại trong list để trả về frontend
      for (const a of allAssignments) {
        if (assignmentIdsToMark.includes(a.id)) {
          a.status = ASSIGNMENT_STATUS.INCOMPLETE;
          a.incompleteReason = data.incompleteReason;
        }
      }

      // Gửi thông báo cho workflow subscribers và Sale Admin
      const order = await this.saOrderRepository.findOne({ where: { id: orderId } });
      if (order) {
        await this.notificationHelper.notifyWorkflowSubscribersAboutTaskCompletion(
          order,
          assignment,
          employeeName,
          false,
          data.incompleteReason
        );

        // Gửi thông báo cho các nhân viên khác trong nhóm
        const otherAssignments = inProgressAssignmentsInGroup.filter(a => a.assignedToId !== employeeId);
        for (const otherAssignment of otherAssignments) {
          const otherEmployee = await this.employeeRepository.findOne({
            where: { id: otherAssignment.assignedToId },
            relations: ['user'],
          });
          if (otherEmployee?.userId) {
            const taskTypeLabel = TASK_TYPE_LABELS[assignment.taskType] || assignment.taskType;
            await this.notificationHelper.sendBatchNotifications(
              [otherEmployee],
              `Công việc chưa hoàn thành: ${taskTypeLabel}`,
              `${employeeName} đã báo cáo chưa hoàn thành công việc "${taskTypeLabel}".\nĐơn hàng: ${order.refNo}\nLý do: ${data.incompleteReason}\nTất cả nhân viên trong nhóm cũng được chuyển sang trạng thái chưa hoàn thành.\nNhấn để xem chi tiết`,
              NOTIFICATION_TYPE.MISA_SA_ORDER_TASK_ASSIGNED,
              order.id,
              {
                orderId: order.id,
                refNo: order.refNo,
                taskType: assignment.taskType,
                assignmentId: otherAssignment.id,
                reportedByEmployeeId: employeeId,
                reportedByName: employeeName,
                incompleteReason: data.incompleteReason,
              }
            );
          }
        }
      }

      const updatedAssignment = allAssignments.find(a => a.id === assignmentId);
      const markedCount = assignmentIdsToMark.length;

      return {
        success: true,
        message: markedCount > 1
          ? `Đã báo cáo chưa hoàn thành cho ${markedCount} người trong nhóm`
          : 'Đã báo cáo chưa hoàn thành',
        assignment: updatedAssignment,
        assignments: allAssignments,
      };
    } catch (error: any) {
      this.logger.error(`Lỗi báo chưa hoàn thành: ${error.message}`);
      return { success: false, message: `Lỗi: ${error.message}` };
    }
  }

  /**
   * Báo sự cố/tạm dừng công việc
   * Khác với incomplete: có thể bắt đầu lại mà không cần giao lại công việc
   */
  async markAssignmentBlocked(
    assignmentId: number,
    employeeId: number,
    data: {
      blockedReason: string;
      attachments?: string[];
    }
  ): Promise<{ success: boolean; message: string; assignment?: MisaSaOrderAssignment; assignments?: MisaSaOrderAssignment[] }> {
    try {
      if (!data.blockedReason?.trim()) {
        return { success: false, message: 'Vui lòng nhập lý do tạm dừng' };
      }

      const assignment = await this.assignmentRepository.findOne({
        where: { id: assignmentId, deletedAt: IsNull() },
        relations: ['order'],
      });

      if (!assignment) {
        return { success: false, message: 'Công việc không tồn tại' };
      }

      // Kiểm tra quyền: phải là người được giao HOẶC thành viên cùng nhóm
      const isMember = await this.isGroupMember(assignment, employeeId);
      if (!isMember) {
        return { success: false, message: 'Bạn không có quyền thao tác công việc này' };
      }

      const employee = await this.employeeRepository.findOne({
        where: { id: employeeId },
        relations: ['user'],
      });
      const employeeName = employee ? this.getEmployeeName(employee) : `NV #${employeeId}`;
      const orderId = assignment.orderId;

      // Lấy tất cả assignments IN_PROGRESS hoặc PENDING cùng taskType để đánh dấu blocked cùng lúc
      const allAssignments = await this.getAssignmentsByOrderId(orderId);
      const inProgressAssignmentsInGroup = allAssignments.filter(
        a => a.taskType === assignment.taskType &&
          (a.status === ASSIGNMENT_STATUS.IN_PROGRESS || a.status === ASSIGNMENT_STATUS.PENDING)
      );

      // Cập nhật tất cả thành BLOCKED
      const assignmentIdsToMark = inProgressAssignmentsInGroup.map(a => a.id);
      if (assignmentIdsToMark.length > 0) {
        await this.assignmentRepository
          .createQueryBuilder()
          .update()
          .set({
            status: ASSIGNMENT_STATUS.BLOCKED,
            incompleteReason: data.blockedReason, // Dùng chung field để lưu lý do
            attachments: data.attachments || null,
          })
          .whereInIds(assignmentIdsToMark)
          .execute();
      }

      // Tạo 1 báo cáo sự cố chung cho cả nhóm
      await this.taskReportRepository.save({
        assignmentId: assignmentId,
        orderId,
        reportedById: employeeId,
        reportedByName: employeeName,
        reportDate: new Date(),
        reportType: REPORT_TYPE.ISSUE,
        status: REPORT_STATUS.BLOCKED,
        description: data.blockedReason,
        blockedReason: data.blockedReason,
        attachments: data.attachments || null,
      });

      // Cập nhật lại trong list để trả về frontend
      for (const a of allAssignments) {
        if (assignmentIdsToMark.includes(a.id)) {
          a.status = ASSIGNMENT_STATUS.BLOCKED;
          a.incompleteReason = data.blockedReason;
        }
      }

      // Gửi thông báo cho workflow subscribers và Sale Admin
      const order = await this.saOrderRepository.findOne({ where: { id: orderId } });
      if (order) {
        const taskTypeLabel = TASK_TYPE_LABELS[assignment.taskType] || assignment.taskType;
        const recipients = await this.notificationHelper.getOrderStakeholders(order, [employeeId]);
        if (recipients.length > 0) {
          await this.notificationHelper.sendBatchNotifications(
            recipients,
            `Sự cố tạm dừng: ${taskTypeLabel} - ${order.refNo}`,
            `${employeeName} đã báo cáo sự cố tạm dừng công việc "${taskTypeLabel}".\nĐơn hàng: ${order.refNo}\nLý do: ${data.blockedReason}\nCông việc có thể được bắt đầu lại sau khi khắc phục sự cố.`,
            NOTIFICATION_TYPE.MISA_SA_ORDER_STATUS_CHANGED,
            order.id,
            {
              orderId: order.id,
              refNo: order.refNo,
              taskType: assignment.taskType,
              assignmentId: assignmentId,
              blockedReason: data.blockedReason,
              isBlocked: true,
            }
          );
        }

        // Gửi thông báo cho các nhân viên khác trong nhóm
        const otherAssignments = inProgressAssignmentsInGroup.filter(a => a.assignedToId !== employeeId);
        for (const otherAssignment of otherAssignments) {
          const otherEmployee = await this.employeeRepository.findOne({
            where: { id: otherAssignment.assignedToId },
            relations: ['user'],
          });
          if (otherEmployee?.userId) {
            await this.notificationHelper.sendBatchNotifications(
              [otherEmployee],
              `Công việc tạm dừng: ${taskTypeLabel}`,
              `${employeeName} đã báo cáo sự cố tạm dừng công việc "${taskTypeLabel}".\nĐơn hàng: ${order.refNo}\nLý do: ${data.blockedReason}\nTất cả nhân viên trong nhóm cũng được chuyển sang trạng thái tạm dừng.\nNhấn để xem chi tiết`,
              NOTIFICATION_TYPE.MISA_SA_ORDER_TASK_ASSIGNED,
              order.id,
              {
                orderId: order.id,
                refNo: order.refNo,
                taskType: assignment.taskType,
                assignmentId: otherAssignment.id,
                reportedByEmployeeId: employeeId,
                reportedByName: employeeName,
                blockedReason: data.blockedReason,
                isBlocked: true,
              }
            );
          }
        }
      }

      const updatedAssignment = allAssignments.find(a => a.id === assignmentId);
      const markedCount = assignmentIdsToMark.length;

      return {
        success: true,
        message: markedCount > 1
          ? `Đã báo cáo sự cố tạm dừng cho ${markedCount} người trong nhóm`
          : 'Đã báo cáo sự cố tạm dừng công việc',
        assignment: updatedAssignment,
        assignments: allAssignments,
      };
    } catch (error: any) {
      this.logger.error(`Lỗi báo sự cố tạm dừng: ${error.message}`);
      return { success: false, message: `Lỗi: ${error.message}` };
    }
  }

  /**
   * Bắt đầu lại công việc từ trạng thái BLOCKED (tạm dừng)
   * Không tạo assignment mới, chỉ chuyển trạng thái về IN_PROGRESS
   */
  async resumeAssignment(
    assignmentId: number,
    employeeId: number,
    data?: {
      notes?: string;
    }
  ): Promise<{ success: boolean; message: string; assignment?: MisaSaOrderAssignment; assignments?: MisaSaOrderAssignment[] }> {
    try {
      const assignment = await this.assignmentRepository.findOne({
        where: { id: assignmentId, deletedAt: IsNull() },
        relations: ['order'],
      });

      if (!assignment) {
        return { success: false, message: 'Công việc không tồn tại' };
      }

      // Chỉ cho phép resume từ trạng thái BLOCKED
      if (assignment.status !== ASSIGNMENT_STATUS.BLOCKED) {
        return {
          success: false,
          message: `Chỉ có thể bắt đầu lại công việc đang tạm dừng. Trạng thái hiện tại: "${ASSIGNMENT_STATUS_LABELS[assignment.status] || assignment.status}"`,
        };
      }

      const employee = await this.employeeRepository.findOne({
        where: { id: employeeId },
        relations: ['user', 'roleGroups'],
      });

      if (!employee) {
        return { success: false, message: 'Không tìm thấy thông tin nhân viên' };
      }

      // Kiểm tra quyền: chỉ những người có quyền quản lý mới được bắt đầu lại
      // Lấy permissions từ roleGroups (merged)
      const allowedPermissions = [
        EMPLOYEE_PERMISSION.APPROVE_ORDER,
        EMPLOYEE_PERMISSION.MANAGER,
        EMPLOYEE_PERMISSION.ASSIGN_ORDER_TO_WAREHOUSE,
        EMPLOYEE_PERMISSION.ASSIGN_ORDER_TO_TECHNICAL,
        EMPLOYEE_PERMISSION.SUBMIT_ORDER_FOR_APPROVAL,
      ];

      const mergedPermissions = mergeEmployeePermissions(employee as any);
      const hasPermission = mergedPermissions.permissions.some(p => allowedPermissions.includes(p as any));
      if (!hasPermission) {
        return {
          success: false,
          message: 'Bạn không có quyền bắt đầu lại công việc. Chỉ quản lý hoặc người có quyền giao việc mới được thực hiện thao tác này.'
        };
      }

      const employeeName = this.getEmployeeName(employee);
      const orderId = assignment.orderId;
      const now = new Date();

      // Lấy tất cả assignments BLOCKED cùng taskType để resume cùng lúc
      const allAssignments = await this.getAssignmentsByOrderId(orderId);
      const blockedAssignmentsInGroup = allAssignments.filter(
        a => a.taskType === assignment.taskType && a.status === ASSIGNMENT_STATUS.BLOCKED
      );

      // Cập nhật tất cả thành IN_PROGRESS
      const assignmentIdsToResume = blockedAssignmentsInGroup.map(a => a.id);
      if (assignmentIdsToResume.length > 0) {
        await this.assignmentRepository
          .createQueryBuilder()
          .update()
          .set({
            status: ASSIGNMENT_STATUS.IN_PROGRESS,
            // Không xóa incompleteReason để giữ lịch sử
          })
          .whereInIds(assignmentIdsToResume)
          .execute();
      }

      // Tạo báo cáo ghi nhận việc bắt đầu lại
      await this.taskReportRepository.save({
        assignmentId: assignmentId,
        orderId,
        reportedById: employeeId,
        reportedByName: employeeName,
        reportDate: new Date(),
        reportType: REPORT_TYPE.DAILY_PROGRESS,
        status: REPORT_STATUS.IN_PROGRESS,
        description: data?.notes || 'Bắt đầu lại công việc sau khi khắc phục sự cố',
        progressPercent: null,
      });

      // Cập nhật lại trong list để trả về frontend
      for (const a of allAssignments) {
        if (assignmentIdsToResume.includes(a.id)) {
          a.status = ASSIGNMENT_STATUS.IN_PROGRESS;
        }
      }

      // Gửi thông báo
      const order = assignment.order || await this.saOrderRepository.findOne({ where: { id: orderId } });
      if (order) {
        const taskTypeLabel = TASK_TYPE_LABELS[assignment.taskType] || assignment.taskType;

        // Thông báo cho stakeholders
        const recipients = await this.notificationHelper.getOrderStakeholders(order, [employeeId]);
        if (recipients.length > 0) {
          await this.notificationHelper.sendBatchNotifications(
            recipients,
            `Bắt đầu lại: ${taskTypeLabel} - ${order.refNo}`,
            `${employeeName} đã bắt đầu lại công việc "${taskTypeLabel}" sau khi khắc phục sự cố.\nĐơn hàng: ${order.refNo}`,
            NOTIFICATION_TYPE.MISA_SA_ORDER_STATUS_CHANGED,
            order.id,
            {
              orderId: order.id,
              refNo: order.refNo,
              taskType: assignment.taskType,
              assignmentId: assignmentId,
              isResumed: true,
            }
          );
        }

        // Gửi thông báo cho các nhân viên khác trong nhóm
        const otherAssignments = blockedAssignmentsInGroup.filter(a => a.assignedToId !== employeeId);
        for (const otherAssignment of otherAssignments) {
          const otherEmployee = await this.employeeRepository.findOne({
            where: { id: otherAssignment.assignedToId },
            relations: ['user'],
          });
          if (otherEmployee?.userId) {
            await this.notificationHelper.sendBatchNotifications(
              [otherEmployee],
              `Công việc đã bắt đầu lại: ${taskTypeLabel}`,
              `${employeeName} đã bắt đầu lại công việc "${taskTypeLabel}".\nĐơn hàng: ${order.refNo}\nTất cả nhân viên trong nhóm cũng được chuyển sang trạng thái đang thực hiện.\nNhấn để xem chi tiết`,
              NOTIFICATION_TYPE.MISA_SA_ORDER_TASK_ASSIGNED,
              order.id,
              {
                orderId: order.id,
                refNo: order.refNo,
                taskType: assignment.taskType,
                assignmentId: otherAssignment.id,
                resumedByEmployeeId: employeeId,
                resumedByName: employeeName,
                isResumed: true,
              }
            );
          }
        }
      }

      // Ghi lịch sử workflow
      await this.recordWorkflowHistory({
        orderId,
        action: WORKFLOW_ACTION.RESUME_TASK,
        fromStatus: ASSIGNMENT_STATUS.BLOCKED,
        toStatus: ASSIGNMENT_STATUS.IN_PROGRESS,
        performedByEmployeeId: employeeId,
        performedByName: employeeName,
        notes: data?.notes,
        metadata: {
          taskType: assignment.taskType,
          taskTypeLabel: TASK_TYPE_LABELS[assignment.taskType] || assignment.taskType,
          assignmentId,
          resumedCount: assignmentIdsToResume.length,
        },
      });

      const updatedAssignment = allAssignments.find(a => a.id === assignmentId);
      const resumedCount = assignmentIdsToResume.length;

      return {
        success: true,
        message: resumedCount > 1
          ? `Đã bắt đầu lại công việc cho ${resumedCount} người trong nhóm`
          : 'Đã bắt đầu lại công việc',
        assignment: updatedAssignment,
        assignments: allAssignments,
      };
    } catch (error: any) {
      this.logger.error(`Lỗi bắt đầu lại công việc: ${error.message}`);
      return { success: false, message: `Lỗi: ${error.message}` };
    }
  }

  /**
   * Giao tiếp việc cho người đã làm (sau khi incomplete)
   * - Đánh dấu assignment cũ là REASSIGNED
   * - Tạo assignment mới với status PENDING
   * - Lịch sử được ghi vào workflowHistory
   */
  async retryAssignment(
    assignmentId: number,
    retryById: number,
    data: {
      notes?: string;
      scheduledAt?: Date;
    }
  ): Promise<{ success: boolean; message: string; assignment?: MisaSaOrderAssignment; assignments?: MisaSaOrderAssignment[] }> {
    try {
      const oldAssignment = await this.assignmentRepository.findOne({
        where: { id: assignmentId, deletedAt: IsNull() },
        relations: ['order'],
      });

      if (!oldAssignment) {
        return { success: false, message: 'Công việc không tồn tại' };
      }

      // Cho phép retry cho các trạng thái: incomplete, pending, in_progress
      // Không cho phép retry completed hoặc reassigned
      const allowedStatuses = [
        ASSIGNMENT_STATUS.INCOMPLETE,
        ASSIGNMENT_STATUS.PENDING,
        ASSIGNMENT_STATUS.IN_PROGRESS,
      ];

      if (!allowedStatuses.includes(oldAssignment.status as any)) {
        return {
          success: false,
          message: `Không thể giao lại công việc ở trạng thái "${oldAssignment.status}"`,
        };
      }

      const retryBy = await this.employeeRepository.findOne({
        where: { id: retryById },
        relations: ['user'],
      });
      const retryByName = retryBy ? this.getEmployeeName(retryBy) : `NV #${retryById}`;

      const orderId = oldAssignment.orderId;
      const previousStatus = oldAssignment.status;

      // Đánh dấu assignment cũ là REASSIGNED (không thao tác được nữa)
      await this.assignmentRepository.update(assignmentId, {
        status: ASSIGNMENT_STATUS.REASSIGNED,
        reassignReason: data.notes || `Giao lại lần ${await this.countRetries(orderId, oldAssignment.taskType, oldAssignment.assignedToId) + 1}`,
      });

      // Tạo assignment MỚI cho cùng nhân viên
      const newAssignment = this.assignmentRepository.create({
        orderId,
        taskType: oldAssignment.taskType,
        assignedToId: oldAssignment.assignedToId,
        assignedToName: oldAssignment.assignedToName,
        assignedById: retryById,
        assignedByName: retryByName,
        assignedAt: new Date(),
        scheduledAt: data.scheduledAt || null,
        status: ASSIGNMENT_STATUS.PENDING,
        notes: data.notes || null,
        reassignedFromId: assignmentId, // Link tới assignment cũ
        reassignReason: `Giao lại từ lần trước (${previousStatus})`,
      });

      await this.assignmentRepository.save(newAssignment);

      // Ghi lịch sử workflow (không tạo TaskReport - giống như giao việc bình thường)
      await this.recordWorkflowHistory({
        orderId,
        action: WORKFLOW_ACTION.RETRY_TASK,
        fromStatus: previousStatus,
        performedByEmployeeId: retryById,
        performedByName: retryByName,
        notes: data.notes,
        metadata: {
          taskType: oldAssignment.taskType,
          taskTypeLabel: TASK_TYPE_LABELS[oldAssignment.taskType] || oldAssignment.taskType,
          oldAssignmentId: assignmentId,
          newAssignmentId: newAssignment.id,
          assignedToId: oldAssignment.assignedToId,
          assignedToName: oldAssignment.assignedToName,
          scheduledAt: data.scheduledAt,
        },
      });

      // Gửi thông báo cho người được giao (nhắc họ tiếp tục)
      const assignedTo = await this.employeeRepository.findOne({
        where: { id: oldAssignment.assignedToId },
        relations: ['user'],
      });

      const order = oldAssignment.order || await this.saOrderRepository.findOne({ where: { id: orderId } });

      if (assignedTo?.userId && order) {
        const taskTypeLabel = TASK_TYPE_LABELS[oldAssignment.taskType] || oldAssignment.taskType;
        await this.notificationHelper.sendBatchNotifications(
          [assignedTo],
          `Giao lại công việc: ${taskTypeLabel}`,
          `${retryByName} đã giao lại công việc "${taskTypeLabel}" cho bạn.\nĐơn hàng: ${order.refNo}\nKhách hàng: ${order.accountObjectName || 'Không xác định'}${data.notes ? `\nGhi chú: ${data.notes}` : ''}\nNhấn để xem chi tiết`,
          NOTIFICATION_TYPE.MISA_SA_ORDER_TASK_ASSIGNED,
          order.id,
          {
            orderId: order.id,
            refNo: order.refNo,
            taskType: oldAssignment.taskType,
            assignmentId: newAssignment.id,
            isRetry: true,
          }
        );
      }

      // Gửi thông báo cho stakeholders
      if (order) {
        const recipients = await this.notificationHelper.getOrderStakeholders(order, [
          retryById,
          oldAssignment.assignedToId,
        ]);

        if (recipients.length > 0) {
          const taskTypeLabel = TASK_TYPE_LABELS[oldAssignment.taskType] || oldAssignment.taskType;
          await this.notificationHelper.sendBatchNotifications(
            recipients,
            `Giao lại công việc: ${taskTypeLabel} - ${order.refNo}`,
            `${retryByName} đã giao lại công việc "${taskTypeLabel}" cho ${oldAssignment.assignedToName}.\nĐơn hàng: ${order.refNo}${data.notes ? `\nGhi chú: ${data.notes}` : ''}`,
            NOTIFICATION_TYPE.MISA_SA_ORDER_STATUS_CHANGED,
            order.id,
            {
              orderId: order.id,
              refNo: order.refNo,
              taskType: oldAssignment.taskType,
              assignmentId: newAssignment.id,
              isRetry: true,
            }
          );
        }
      }

      // Lấy tất cả assignments của order để trả về cho frontend
      const allAssignments = await this.getAssignmentsByOrderId(orderId);

      return {
        success: true,
        message: 'Đã giao lại công việc thành công',
        assignment: newAssignment,
        assignments: allAssignments,
      };
    } catch (error: any) {
      this.logger.error(`Lỗi giao lại công việc: ${error.message}`);
      return { success: false, message: `Lỗi: ${error.message}` };
    }
  }

  /**
   * Đếm số lần đã giao lại cho cùng 1 nhân viên trong 1 bước công việc
   */
  private async countRetries(orderId: number, taskType: string, assignedToId: number): Promise<number> {
    const count = await this.assignmentRepository.count({
      where: {
        orderId,
        taskType,
        assignedToId,
        deletedAt: IsNull(),
      },
    });
    return count;
  }

  /**
   * Giao lại việc cho cả nhóm (Lần mới)
   * - Đánh dấu TẤT CẢ assignments hiện tại (chưa REASSIGNED) thành REASSIGNED
   * - Tạo assignments mới cho các nhân viên được chỉ định
   */
  async retryTaskGroup(
    orderId: number,
    taskType: string,
    retryById: number,
    data: {
      retryEmployeeIds: number[]; // Nhân viên cũ cần giao lại
      newEmployeeIds: number[];   // Nhân viên mới cần thêm
      notes?: string;
    }
  ): Promise<{ success: boolean; message: string; assignments?: MisaSaOrderAssignment[] }> {
    try {
      const order = await this.saOrderRepository.findOne({
        where: { id: orderId, deletedAt: IsNull() },
      });

      if (!order) {
        return { success: false, message: 'Đơn hàng không tồn tại' };
      }

      const retryBy = await this.employeeRepository.findOne({
        where: { id: retryById },
        relations: ['user'],
      });
      const retryByName = retryBy ? this.getEmployeeName(retryBy) : `NV #${retryById}`;

      // Lấy TẤT CẢ assignments hiện tại của taskType này (chưa bị REASSIGNED)
      const currentAssignments = await this.assignmentRepository.find({
        where: {
          orderId,
          taskType,
          status: In([
            ASSIGNMENT_STATUS.PENDING,
            ASSIGNMENT_STATUS.IN_PROGRESS,
            ASSIGNMENT_STATUS.COMPLETED,
            ASSIGNMENT_STATUS.INCOMPLETE,
          ]),
          deletedAt: IsNull(),
        },
      });

      if (currentAssignments.length === 0 && data.retryEmployeeIds.length === 0 && data.newEmployeeIds.length === 0) {
        return { success: false, message: 'Không có công việc nào để giao lại' };
      }

      // 1. Đánh dấu TẤT CẢ assignments hiện tại thành REASSIGNED
      if (currentAssignments.length > 0) {
        const assignmentIds = currentAssignments.map(a => a.id);
        await this.assignmentRepository
          .createQueryBuilder()
          .update()
          .set({
            status: ASSIGNMENT_STATUS.REASSIGNED,
            reassignReason: data.notes || 'Chuyển sang lần giao việc mới',
          })
          .whereInIds(assignmentIds)
          .execute();

        this.logger.log(`[retryTaskGroup] Đã chuyển ${assignmentIds.length} assignments sang REASSIGNED`);
      }

      // 2. Tạo assignments mới cho nhân viên cũ (retry)
      const newAssignments: MisaSaOrderAssignment[] = [];

      for (const empId of data.retryEmployeeIds) {
        const employee = await this.employeeRepository.findOne({
          where: { id: empId, deletedAt: IsNull() },
          relations: ['user'],
        });

        if (!employee) continue;

        const employeeName = this.getEmployeeName(employee);
        const oldAssignment = currentAssignments.find(a => a.assignedToId === empId);

        const newAssignment = this.assignmentRepository.create({
          orderId,
          taskType,
          assignedToId: empId,
          assignedToName: employeeName,
          assignedById: retryById,
          assignedByName: retryByName,
          assignedAt: new Date(),
          status: ASSIGNMENT_STATUS.PENDING,
          notes: data.notes || null,
          reassignedFromId: oldAssignment?.id || null,
          reassignReason: oldAssignment ? `Giao lại từ lần trước (${oldAssignment.status})` : null,
        });

        await this.assignmentRepository.save(newAssignment);
        newAssignments.push(newAssignment);

        // Gửi thông báo cho nhân viên
        if (employee.userId) {
          const taskTypeLabel = TASK_TYPE_LABELS[taskType] || taskType;
          await this.notificationHelper.sendBatchNotifications(
            [employee],
            `Giao lại công việc: ${taskTypeLabel}`,
            `${retryByName} đã giao lại công việc "${taskTypeLabel}" cho bạn.\nĐơn hàng: ${order.refNo}\nKhách hàng: ${order.accountObjectName || 'Không xác định'}${data.notes ? `\nGhi chú: ${data.notes}` : ''}\nNhấn để xem chi tiết`,
            NOTIFICATION_TYPE.MISA_SA_ORDER_TASK_ASSIGNED,
            order.id,
            {
              orderId: order.id,
              refNo: order.refNo,
              taskType,
              assignmentId: newAssignment.id,
              isRetry: true,
            }
          );
        }
      }

      // 3. Tạo assignments mới cho nhân viên mới
      for (const empId of data.newEmployeeIds) {
        const employee = await this.employeeRepository.findOne({
          where: { id: empId, deletedAt: IsNull() },
          relations: ['user'],
        });

        if (!employee) continue;

        const employeeName = this.getEmployeeName(employee);

        const newAssignment = this.assignmentRepository.create({
          orderId,
          taskType,
          assignedToId: empId,
          assignedToName: employeeName,
          assignedById: retryById,
          assignedByName: retryByName,
          assignedAt: new Date(),
          status: ASSIGNMENT_STATUS.PENDING,
          notes: data.notes || null,
        });

        await this.assignmentRepository.save(newAssignment);
        newAssignments.push(newAssignment);

        // Gửi thông báo cho nhân viên mới
        await this.notificationHelper.notifyAssignedEmployee(order, newAssignment, employee, retryByName);
      }

      // Ghi lịch sử workflow
      await this.recordWorkflowHistory({
        orderId,
        action: WORKFLOW_ACTION.RETRY_TASK,
        performedByEmployeeId: retryById,
        performedByName: retryByName,
        notes: data.notes,
        metadata: {
          taskType,
          taskTypeLabel: TASK_TYPE_LABELS[taskType] || taskType,
          oldAssignmentCount: currentAssignments.length,
          retryEmployeeIds: data.retryEmployeeIds,
          newEmployeeIds: data.newEmployeeIds,
          newAssignmentCount: newAssignments.length,
        },
      });

      // Lấy tất cả assignments của order để trả về
      const allAssignments = await this.getAssignmentsByOrderId(orderId);

      const totalNew = data.retryEmployeeIds.length + data.newEmployeeIds.length;
      return {
        success: true,
        message: `Đã giao lại việc cho ${totalNew} nhân viên`,
        assignments: allAssignments,
      };
    } catch (error: any) {
      this.logger.error(`Lỗi giao lại việc nhóm: ${error.message}`);
      return { success: false, message: `Lỗi: ${error.message}` };
    }
  }

  /**
   * Giao lại công việc cho người khác
   */
  async reassignTask(
    assignmentId: number,
    reassignById: number,
    data: {
      newAssignedToId: number;
      reassignReason: string;
      scheduledAt?: Date;
      notes?: string;
    }
  ): Promise<{ success: boolean; message: string; assignment?: MisaSaOrderAssignment; assignments?: MisaSaOrderAssignment[] }> {
    try {
      if (!data.reassignReason?.trim()) {
        return { success: false, message: 'Vui lòng nhập lý do giao lại' };
      }

      const oldAssignment = await this.assignmentRepository.findOne({
        where: { id: assignmentId, deletedAt: IsNull() },
        relations: ['order'],
      });

      if (!oldAssignment) {
        return { success: false, message: 'Công việc không tồn tại' };
      }

      const orderId = oldAssignment.orderId;

      // Kiểm tra người được giao mới
      const newAssignedTo = await this.employeeRepository.findOne({
        where: { id: data.newAssignedToId, deletedAt: IsNull() },
        relations: ['user'],
      });

      if (!newAssignedTo) {
        return { success: false, message: 'Nhân viên được giao mới không tồn tại' };
      }

      const reassignBy = await this.employeeRepository.findOne({
        where: { id: reassignById },
        relations: ['user'],
      });
      const reassignByName = reassignBy ? this.getEmployeeName(reassignBy) : `NV #${reassignById}`;
      const newAssignedToName = this.getEmployeeName(newAssignedTo);

      // Cập nhật assignment cũ
      await this.assignmentRepository.update(assignmentId, {
        status: ASSIGNMENT_STATUS.REASSIGNED,
        reassignReason: data.reassignReason,
      });

      // Tạo assignment mới
      const newAssignment = this.assignmentRepository.create({
        orderId,
        taskType: oldAssignment.taskType,
        assignedToId: data.newAssignedToId,
        assignedToName: newAssignedToName,
        assignedById: reassignById,
        assignedByName: reassignByName,
        assignedAt: new Date(),
        scheduledAt: data.scheduledAt || oldAssignment.scheduledAt,
        status: ASSIGNMENT_STATUS.PENDING,
        notes: data.notes || null,
        reassignedFromId: assignmentId,
        reassignReason: data.reassignReason,
      });

      await this.assignmentRepository.save(newAssignment);

      // Ghi lịch sử workflow
      await this.recordWorkflowHistory({
        orderId,
        action: WORKFLOW_ACTION.REASSIGN_TASK,
        performedByEmployeeId: reassignById,
        performedByName: reassignByName,
        notes: data.reassignReason,
        metadata: {
          taskType: oldAssignment.taskType,
          oldAssignmentId: assignmentId,
          oldAssignedToId: oldAssignment.assignedToId,
          oldAssignedToName: oldAssignment.assignedToName,
          newAssignmentId: newAssignment.id,
          newAssignedToId: data.newAssignedToId,
          newAssignedToName,
        },
      });

      // Gửi thông báo cho người được giao mới
      const order = oldAssignment.order || await this.saOrderRepository.findOne({ where: { id: orderId } });
      if (order) {
        await this.notificationHelper.notifyReassignedEmployee(
          order,
          newAssignment,
          newAssignedTo,
          reassignByName,
          oldAssignment.assignedToName || ''
        );
      }

      // Lấy tất cả assignments của order để trả về cho frontend
      const allAssignments = await this.getAssignmentsByOrderId(orderId);

      return {
        success: true,
        message: 'Giao lại công việc thành công',
        assignment: newAssignment,
        assignments: allAssignments,
      };
    } catch (error: any) {
      this.logger.error(`Lỗi giao lại công việc: ${error.message}`);
      return { success: false, message: `Lỗi: ${error.message}` };
    }
  }

  /**
   * Tạo báo cáo tiến độ hàng ngày
   * Nếu progressPercent = 100 hoặc status = completed → tự động hoàn thành tất cả assignments trong nhóm
   * Nếu status = incomplete/blocked → tự động đánh dấu chưa hoàn thành tất cả assignments trong nhóm
   */
  async createDailyReport(
    assignmentId: number,
    employeeId: number,
    data: {
      status: string;
      progressPercent?: number;
      description: string;
      blockedReason?: string;
      attachments?: string[];
    }
  ): Promise<{ success: boolean; message: string; report?: MisaSaOrderTaskReport; assignments?: MisaSaOrderAssignment[] }> {
    try {
      const assignment = await this.assignmentRepository.findOne({
        where: { id: assignmentId, deletedAt: IsNull() },
        relations: ['order'],
      });

      if (!assignment) {
        return { success: false, message: 'Công việc không tồn tại' };
      }

      // Kiểm tra quyền: phải là người được giao HOẶC thành viên cùng nhóm
      const isMember = await this.isGroupMember(assignment, employeeId);
      if (!isMember) {
        return { success: false, message: 'Bạn không có quyền thao tác công việc này' };
      }

      const employee = await this.employeeRepository.findOne({
        where: { id: employeeId },
        relations: ['user'],
      });
      const employeeName = employee ? this.getEmployeeName(employee) : `NV #${employeeId}`;
      const orderId = assignment.orderId;

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Kiểm tra nếu báo cáo hoàn thành (100%) → gọi completeAssignment
      const isCompletionReport = data.progressPercent === 100 || data.status === REPORT_STATUS.COMPLETED;
      const isIncompleteReport = data.status === REPORT_STATUS.INCOMPLETE;
      const isBlockedReport = data.status === REPORT_STATUS.BLOCKED;

      if (isCompletionReport) {
        // Gọi completeAssignment để hoàn thành tất cả trong nhóm
        const result = await this.completeAssignment(assignmentId, employeeId, {
          completionNotes: data.description,
          attachments: data.attachments,
        });

        return {
          success: result.success,
          message: result.success ? 'Báo cáo hoàn thành và đã cập nhật trạng thái cho tất cả nhân viên trong nhóm' : result.message,
          assignments: result.assignments,
        };
      }

      if (isIncompleteReport) {
        // Gọi markAssignmentIncomplete để đánh dấu chưa hoàn thành tất cả trong nhóm
        // Đây là trường hợp không thể hoàn thành, cần giao lại công việc
        const result = await this.markAssignmentIncomplete(assignmentId, employeeId, {
          incompleteReason: data.blockedReason || data.description,
          attachments: data.attachments,
        });

        return {
          success: result.success,
          message: result.success ? 'Báo cáo chưa hoàn thành và đã cập nhật trạng thái cho tất cả nhân viên trong nhóm' : result.message,
          assignments: result.assignments,
        };
      }

      if (isBlockedReport) {
        // Gọi markAssignmentBlocked để đánh dấu tạm dừng tất cả trong nhóm
        // Đây là trường hợp sự cố tạm thời, có thể bắt đầu lại sau
        const result = await this.markAssignmentBlocked(assignmentId, employeeId, {
          blockedReason: data.blockedReason || data.description,
          attachments: data.attachments,
        });

        return {
          success: result.success,
          message: result.message,
          assignments: result.assignments,
        };
      }

      // Báo cáo tiến độ bình thường (không phải 100% và không phải incomplete)
      // Kiểm tra đã có báo cáo hôm nay chưa
      const existingReport = await this.taskReportRepository.findOne({
        where: {
          assignmentId,
          reportDate: today,
          reportType: REPORT_TYPE.DAILY_PROGRESS,
          deletedAt: IsNull(),
        },
      });

      if (existingReport) {
        // Cập nhật báo cáo hiện có
        await this.taskReportRepository.update(existingReport.id, {
          status: data.status,
          progressPercent: data.progressPercent ?? existingReport.progressPercent,
          description: data.description,
          blockedReason: data.blockedReason || null,
          attachments: data.attachments || existingReport.attachments,
          reportedAt: new Date(),
        });

        const updatedReport = await this.taskReportRepository.findOne({
          where: { id: existingReport.id },
        });

        // Lấy tất cả assignments để trả về
        const allAssignments = await this.getAssignmentsByOrderId(orderId);

        return {
          success: true,
          message: 'Cập nhật báo cáo thành công',
          report: updatedReport || undefined,
          assignments: allAssignments,
        };
      }

      // Tạo báo cáo mới
      const report = this.taskReportRepository.create({
        assignmentId,
        orderId,
        reportedById: employeeId,
        reportedByName: employeeName,
        reportDate: today,
        reportType: REPORT_TYPE.DAILY_PROGRESS,
        status: data.status,
        progressPercent: data.progressPercent ?? null,
        description: data.description,
        blockedReason: data.blockedReason || null,
        attachments: data.attachments || null,
      });

      await this.taskReportRepository.save(report);

      // Gửi thông báo cho workflow subscribers và Sale Admin
      const order = await this.saOrderRepository.findOne({ where: { id: orderId } });
      if (order) {
        await this.notificationHelper.notifyWorkflowSubscribersAboutDailyReport(order, assignment, report, employeeName);
      }

      // Lấy tất cả assignments để trả về
      const allAssignments = await this.getAssignmentsByOrderId(orderId);

      return {
        success: true,
        message: 'Tạo báo cáo thành công',
        report,
        assignments: allAssignments,
      };
    } catch (error: any) {
      this.logger.error(`Lỗi tạo báo cáo: ${error.message}`);
      return { success: false, message: `Lỗi: ${error.message}` };
    }
  }

  /**
   * Lấy danh sách báo cáo của assignment
   */
  async getReportsByAssignmentId(assignmentId: number): Promise<MisaSaOrderTaskReport[]> {
    return this.taskReportRepository.find({
      where: { assignmentId, deletedAt: IsNull() },
      order: { reportedAt: 'DESC' },
      relations: ['reportedBy'],
    });
  }

  /**
   * Lấy danh sách báo cáo của đơn hàng
   */
  async getReportsByOrderId(orderId: number): Promise<MisaSaOrderTaskReport[]> {
    return this.taskReportRepository.find({
      where: { orderId, deletedAt: IsNull() },
      order: { reportedAt: 'DESC' },
      relations: ['reportedBy', 'assignment'],
    });
  }

  /**
   * Xóa assignment (soft delete)
   */
  async deleteAssignment(
    assignmentId: number,
    deletedById: number
  ): Promise<{ success: boolean; message: string }> {
    try {
      const assignment = await this.assignmentRepository.findOne({
        where: { id: assignmentId, deletedAt: IsNull() },
        relations: ['order'],
      });

      if (!assignment) {
        return { success: false, message: 'Công việc không tồn tại' };
      }

      // Chỉ cho phép xóa khi ở trạng thái pending hoặc in_progress
      if (
        assignment.status !== ASSIGNMENT_STATUS.PENDING &&
        assignment.status !== ASSIGNMENT_STATUS.IN_PROGRESS
      ) {
        return {
          success: false,
          message: 'Chỉ có thể xóa công việc ở trạng thái "Chờ xử lý" hoặc "Đang thực hiện"',
        };
      }

      // Soft delete assignment
      await this.assignmentRepository.softDelete(assignmentId);

      // Xóa các báo cáo liên quan
      await this.taskReportRepository.softDelete({ assignmentId });

      this.logger.log(`Đã xóa assignment #${assignmentId} bởi employee #${deletedById}`);

      return {
        success: true,
        message: 'Đã xóa giao việc thành công',
      };
    } catch (error: any) {
      this.logger.error(`Lỗi xóa assignment: ${error.message}`);
      return { success: false, message: `Lỗi: ${error.message}` };
    }
  }
}
