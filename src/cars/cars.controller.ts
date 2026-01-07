import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common'
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiBody,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiBadRequestResponse,
} from '@nestjs/swagger'
import { CarsService } from './cars.service'
import { CreateBrandDto } from './dto/create-brand.dto'
import { UpdateBrandDto } from './dto/update-brand.dto'
import { CreateCarDto } from './dto/create-car.dto'
import { UpdateCarDto } from './dto/update-car.dto'
import { Brand } from './schemas/brand.schema'
import { Car } from './schemas/car.schema'

@ApiTags('cars')
@Controller()
export class CarsController {
  constructor(private readonly carsService: CarsService) {}

  // Brand endpoints
  @Post('brands')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new brand' })
  @ApiBody({ type: CreateBrandDto })
  @ApiCreatedResponse({
    description: 'Brand successfully created',
    type: Brand,
  })
  @ApiBadRequestResponse({ description: 'Invalid input or brand already exists' })
  async createBrand(@Body() createBrandDto: CreateBrandDto): Promise<Brand> {
    return this.carsService.createBrand(createBrandDto)
  }

  @Get('brands')
  @ApiOperation({ summary: 'Get all brands' })
  @ApiOkResponse({
    description: 'List of all brands',
    type: [Brand],
  })
  async findAllBrands(): Promise<Brand[]> {
    return this.carsService.findAllBrands()
  }

  @Get('brands/:id')
  @ApiOperation({ summary: 'Get brand by ID' })
  @ApiParam({ name: 'id', description: 'Brand ID', example: '507f1f77bcf86cd799439011' })
  @ApiOkResponse({ description: 'Brand found', type: Brand })
  @ApiNotFoundResponse({ description: 'Brand not found' })
  @ApiBadRequestResponse({ description: 'Invalid brand ID' })
  async findBrandById(@Param('id') id: string): Promise<Brand> {
    return this.carsService.findBrandById(id)
  }

  @Patch('brands/:id')
  @ApiOperation({ summary: 'Update brand' })
  @ApiParam({ name: 'id', description: 'Brand ID', example: '507f1f77bcf86cd799439011' })
  @ApiBody({ type: UpdateBrandDto })
  @ApiOkResponse({ description: 'Brand successfully updated', type: Brand })
  @ApiNotFoundResponse({ description: 'Brand not found' })
  @ApiBadRequestResponse({ description: 'Invalid input or brand name already exists' })
  async updateBrand(
    @Param('id') id: string,
    @Body() updateBrandDto: UpdateBrandDto,
  ): Promise<Brand> {
    return this.carsService.updateBrand(id, updateBrandDto)
  }

  @Delete('brands/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete brand' })
  @ApiParam({ name: 'id', description: 'Brand ID', example: '507f1f77bcf86cd799439011' })
  @ApiNoContentResponse({ description: 'Brand successfully deleted' })
  @ApiNotFoundResponse({ description: 'Brand not found' })
  @ApiBadRequestResponse({ description: 'Invalid brand ID or brand has associated cars' })
  async deleteBrand(@Param('id') id: string): Promise<void> {
    return this.carsService.deleteBrand(id)
  }

  // Car endpoints
  @Post('cars')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new car' })
  @ApiBody({ type: CreateCarDto })
  @ApiCreatedResponse({
    description: 'Car successfully created',
    type: Car,
  })
  @ApiBadRequestResponse({ description: 'Invalid input or brand not found' })
  async createCar(@Body() createCarDto: CreateCarDto): Promise<Car> {
    return this.carsService.createCar(createCarDto)
  }

  @Get('cars')
  @ApiOperation({ summary: 'Get all cars' })
  @ApiOkResponse({
    description: 'List of all cars',
    type: [Car],
  })
  async findAllCars(): Promise<Car[]> {
    return this.carsService.findAllCars()
  }

  @Get('cars/:id')
  @ApiOperation({ summary: 'Get car by ID' })
  @ApiParam({ name: 'id', description: 'Car ID', example: '507f1f77bcf86cd799439011' })
  @ApiOkResponse({ description: 'Car found', type: Car })
  @ApiNotFoundResponse({ description: 'Car not found' })
  @ApiBadRequestResponse({ description: 'Invalid car ID' })
  async findCarById(@Param('id') id: string): Promise<Car> {
    return this.carsService.findCarById(id)
  }

  @Get('cars/by-brand/:brandId')
  @ApiOperation({ summary: 'Get all cars by brand ID' })
  @ApiParam({
    name: 'brandId',
    description: 'Brand ID',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiOkResponse({
    description: 'List of cars for the specified brand',
    type: [Car],
  })
  @ApiNotFoundResponse({ description: 'Brand not found' })
  @ApiBadRequestResponse({ description: 'Invalid brand ID' })
  async findCarsByBrand(@Param('brandId') brandId: string): Promise<Car[]> {
    return this.carsService.findCarsByBrand(brandId)
  }

  @Patch('cars/:id')
  @ApiOperation({ summary: 'Update car' })
  @ApiParam({ name: 'id', description: 'Car ID', example: '507f1f77bcf86cd799439011' })
  @ApiBody({ type: UpdateCarDto })
  @ApiOkResponse({ description: 'Car successfully updated', type: Car })
  @ApiNotFoundResponse({ description: 'Car or brand not found' })
  @ApiBadRequestResponse({ description: 'Invalid input' })
  async updateCar(@Param('id') id: string, @Body() updateCarDto: UpdateCarDto): Promise<Car> {
    return this.carsService.updateCar(id, updateCarDto)
  }

  @Delete('cars/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete car' })
  @ApiParam({ name: 'id', description: 'Car ID', example: '507f1f77bcf86cd799439011' })
  @ApiNoContentResponse({ description: 'Car successfully deleted' })
  @ApiNotFoundResponse({ description: 'Car not found' })
  @ApiBadRequestResponse({ description: 'Invalid car ID' })
  async deleteCar(@Param('id') id: string): Promise<void> {
    return this.carsService.deleteCar(id)
  }
}
