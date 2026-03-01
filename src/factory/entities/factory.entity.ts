import { EntityHelper } from 'src/utils/entity-helper';
import { Column, Entity, Point, PrimaryGeneratedColumn } from 'typeorm';
import { Transform } from 'class-transformer';

@Entity()
export class Factory extends EntityHelper {
  @Column({ type: String })
  name: string;

  @Column({ type: String })
  phone: string;

  @Column({ type: String })
  address: string;

  @Column({
    type: 'point',
    spatialFeatureType: 'Point',
    srid: 4326,
    nullable: true,
  })
  @Transform(({ value }) => {
    if (!value) return null;

    // If value is already an object with x, y properties
    // PostGIS point format: x = longitude, y = latitude
    if (
      typeof value === 'object' &&
      value.x !== undefined &&
      value.y !== undefined
    ) {
      return { longitude: value.x, latitude: value.y };
    }

    // If value is a string, parse POINT format: (longitude latitude) or POINT(longitude latitude)
    if (typeof value === 'string') {
      // Handle "POINT(lng lat)" format
      const pointMatch = value.match(/POINT\s*\(\s*([^\s]+)\s+([^\)]+)\s*\)/i);
      if (pointMatch) {
        const longitude = parseFloat(pointMatch[1]);
        const latitude = parseFloat(pointMatch[2]);
        return { longitude, latitude };
      }

      // Handle "(lng,lat)" format
      const coordMatch = value.match(/\(\s*([^,]+)\s*,\s*([^\)]+)\s*\)/);
      if (coordMatch) {
        const longitude = parseFloat(coordMatch[1]);
        const latitude = parseFloat(coordMatch[2]);
        return { longitude, latitude };
      }
    }

    return value;
  })
  location: string | { latitude: number; longitude: number };

  @Column({ type: 'time', precision: 0 })
  hourStartWork: string;

  @Column({ type: 'time', precision: 0 })
  hourEndWork: string;

  @Column({ type: Number })
  maxEmployees: number;

  @Column({ type: 'json', nullable: true })
  workDays: number[]; // [1, 2, 3, 4, 5] for Mon-Fri, [0, 1, 2, 3, 4, 5, 6] for all days

  @Column({ type: 'int', default: 200 })
  radiusMeters: number; // Bán kính cho phép chấm công (mét)

  @Column({ type: 'json', nullable: true })
  branchLocations?: Array<{
    name?: string; // Tên chi nhánh (tùy chọn)
    latitude: number;
    longitude: number;
  }>; // Danh sách vị trí các chi nhánh

  @Column({ type: 'boolean', default: false })
  isGTG: boolean;
}
