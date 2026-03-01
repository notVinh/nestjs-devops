import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

@ValidatorConstraint({ name: 'isNotPastDate', async: false })
export class IsNotPastDateConstraint implements ValidatorConstraintInterface {
  validate(dateString: string): boolean {
    if (!dateString) {
      return false;
    }

    try {
      // Parse the date string (YYYY-MM-DD)
      const inputDate = new Date(dateString);

      // Get today's date at 00:00:00 for comparison
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Input date should be >= today
      return inputDate >= today;
    } catch (error) {
      return false;
    }
  }

  defaultMessage(): string {
    return 'Ngày tăng ca phải từ hôm nay trở về sau';
  }
}

export function IsNotPastDate(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsNotPastDateConstraint,
    });
  };
}
