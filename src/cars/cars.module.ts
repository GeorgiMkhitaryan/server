import { Module } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'
import { CarsController } from './cars.controller'
import { CarsService } from './cars.service'
import { Brand, BrandSchema } from './schemas/brand.schema'
import { Car, CarSchema } from './schemas/car.schema'

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Brand.name, schema: BrandSchema },
      { name: Car.name, schema: CarSchema },
    ]),
  ],
  controllers: [CarsController],
  providers: [CarsService],
  exports: [CarsService],
})
export class CarsModule {}
