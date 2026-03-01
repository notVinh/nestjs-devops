import { EntityHelper } from "src/utils/entity-helper";
import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Employee } from 'src/employee/entities/employee.entity';

@Entity('dailyProduction')
export class DailyProduction extends EntityHelper {
    @Column({ type: 'bigint', name: 'factoryId' })
    factoryId: number;

    @Column({ type: 'bigint', name: 'employeeId' })
    employeeId: number;

    @Column({ type: 'timestamp', name: 'date' })
    date: Date;

    @Column({ type: 'varchar', name: 'productName' })
    productName: string;

    @Column({ type: 'bigint', name: 'quantity' })
    quantity: number;

    @Column({ type: 'decimal', name: 'unitPrice' })
    unitPrice: number;

    @Column({ type: 'decimal', name: 'price' })
    price: number;

    @Column({ type: 'decimal', name: 'totalPrice' })
    totalPrice: number;

    @Column({ type: 'varchar', name: 'note' })
    note: string;

    // Relations
    @ManyToOne(() => Employee, { eager: false })
    @JoinColumn({ name: 'employeeId' })
    employee?: Employee;
}