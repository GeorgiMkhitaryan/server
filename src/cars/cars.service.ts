import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model, Types } from 'mongoose'
import { Brand, BrandDocument } from './schemas/brand.schema'
import { Car, CarDocument } from './schemas/car.schema'
import { CreateBrandDto } from './dto/create-brand.dto'
import { UpdateBrandDto } from './dto/update-brand.dto'
import { CreateCarDto } from './dto/create-car.dto'
import { UpdateCarDto } from './dto/update-car.dto'

@Injectable()
export class CarsService {
  private readonly logger = new Logger(CarsService.name)

  constructor(
    @InjectModel(Brand.name) private brandModel: Model<BrandDocument>,
    @InjectModel(Car.name) private carModel: Model<CarDocument>,
  ) {}

  // Brand CRUD
  async createBrand(createBrandDto: CreateBrandDto): Promise<Brand> {
    try {
      const brand = new this.brandModel(createBrandDto)
      await brand.save()
      this.logger.log(`Brand created: ${brand.name}`)
      return brand.toObject()
    } catch (error) {
      if (error.code === 11000) {
        throw new BadRequestException(
          `Brand with name "${createBrandDto.name}" already exists`,
        )
      }
      throw error
    }
  }

  async findAllBrands(): Promise<Brand[]> {
    return this.brandModel.find().lean()
  }

  async findBrandById(id: string): Promise<Brand> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException(`Invalid brand ID: ${id}`)
    }

    const brand = await this.brandModel.findById(id).lean()

    if (!brand) {
      throw new NotFoundException(`Brand with ID ${id} not found`)
    }

    return brand
  }

  async updateBrand(
    id: string,
    updateBrandDto: UpdateBrandDto,
  ): Promise<Brand> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException(`Invalid brand ID: ${id}`)
    }

    const brand = await this.brandModel.findById(id)

    if (!brand) {
      throw new NotFoundException(`Brand with ID ${id} not found`)
    }

    if (updateBrandDto.name !== undefined) {
      brand.name = updateBrandDto.name
    }
    if (updateBrandDto.country !== undefined) {
      brand.country = updateBrandDto.country
    }

    try {
      await brand.save()
      this.logger.log(`Brand updated: ${brand.name}`)
      return brand.toObject()
    } catch (error) {
      if (error.code === 11000) {
        throw new BadRequestException(
          `Brand with name "${updateBrandDto.name}" already exists`,
        )
      }
      throw error
    }
  }

  async deleteBrand(id: string): Promise<void> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException(`Invalid brand ID: ${id}`)
    }

    const brand = await this.brandModel.findById(id)

    if (!brand) {
      throw new NotFoundException(`Brand with ID ${id} not found`)
    }

    // Check if any cars exist for this brand
    const carsCount = await this.carModel.countDocuments({
      brand: new Types.ObjectId(id),
    })

    if (carsCount > 0) {
      throw new BadRequestException(
        `Cannot delete brand "${brand.name}" because ${carsCount} car(s) are associated with it`,
      )
    }

    await this.brandModel.deleteOne({ _id: id })
    this.logger.log(`Brand deleted: ${brand.name}`)
  }

  // Car CRUD
  async createCar(createCarDto: CreateCarDto): Promise<Car> {
    if (!Types.ObjectId.isValid(createCarDto.brand)) {
      throw new BadRequestException(`Invalid brand ID: ${createCarDto.brand}`)
    }

    const brand = await this.brandModel.findById(createCarDto.brand).lean()

    if (!brand) {
      throw new NotFoundException(
        `Brand with ID ${createCarDto.brand} not found`,
      )
    }

    const car = new this.carModel({
      brand: new Types.ObjectId(createCarDto.brand),
      name: createCarDto.name,
      year: createCarDto.year,
      engine: createCarDto.engine,
    })

    await car.save()
    this.logger.log(`Car created: ${brand.name} ${createCarDto.name}`)
    return car.toObject()
  }

  async findAllCars(): Promise<Car[]> {
    return this.carModel.find().populate('brand', 'name country').lean()
  }

  async findCarById(id: string): Promise<Car> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException(`Invalid car ID: ${id}`)
    }

    const car = await this.carModel
      .findById(id)
      .populate('brand', 'name country')
      .lean()

    if (!car) {
      throw new NotFoundException(`Car with ID ${id} not found`)
    }

    return car
  }

  async findCarsByBrand(brandId: string): Promise<Car[]> {
    if (!Types.ObjectId.isValid(brandId)) {
      throw new BadRequestException(`Invalid brand ID: ${brandId}`)
    }

    const brand = await this.brandModel.findById(brandId).lean()

    if (!brand) {
      throw new NotFoundException(`Brand with ID ${brandId} not found`)
    }

    return this.carModel
      .find({ brand: new Types.ObjectId(brandId) })
      .populate('brand', 'name country')
      .lean()
  }

  async updateCar(id: string, updateCarDto: UpdateCarDto): Promise<Car> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException(`Invalid car ID: ${id}`)
    }

    const car = await this.carModel.findById(id)

    if (!car) {
      throw new NotFoundException(`Car with ID ${id} not found`)
    }

    if (updateCarDto.brand !== undefined) {
      if (!Types.ObjectId.isValid(updateCarDto.brand)) {
        throw new BadRequestException(`Invalid brand ID: ${updateCarDto.brand}`)
      }

      const brand = await this.brandModel.findById(updateCarDto.brand).lean()

      if (!brand) {
        throw new NotFoundException(
          `Brand with ID ${updateCarDto.brand} not found`,
        )
      }

      car.set('brand', new Types.ObjectId(updateCarDto.brand))
    }

    if (updateCarDto.model !== undefined) {
      car.set('model', updateCarDto.model)
    }
    if (updateCarDto.year !== undefined) {
      car.set('year', updateCarDto.year)
    }
    if (updateCarDto.engine !== undefined) {
      car.set('engine', updateCarDto.engine)
    }

    await car.save()
    this.logger.log(`Car updated: ${id}`)
    return car.toObject()
  }

  async deleteCar(id: string): Promise<void> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException(`Invalid car ID: ${id}`)
    }

    const car = await this.carModel.findById(id)

    if (!car) {
      throw new NotFoundException(`Car with ID ${id} not found`)
    }

    await this.carModel.deleteOne({ _id: id })
    this.logger.log(`Car deleted: ${id}`)
  }
}
