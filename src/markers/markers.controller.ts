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
import { MarkersService } from './markers.service'
import { CreateMarkerDto } from './dto/create-marker.dto'
import { UpdateMarkerDto } from './dto/update-marker.dto'
import { Marker } from './schemas/marker.schema'

@ApiTags('markers')
@Controller('markers')
export class MarkersController {
  constructor(private readonly markersService: MarkersService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new marker' })
  @ApiBody({ type: CreateMarkerDto })
  @ApiCreatedResponse({
    description: 'Marker successfully created',
    type: Marker,
  })
  @ApiBadRequestResponse({ description: 'Invalid input data' })
    
  async create(@Body() createMarkerDto: CreateMarkerDto): Promise<Marker> {
    return this.markersService.create(createMarkerDto)
  }

  @Get()
  @ApiOperation({ summary: 'Get all markers' })
  @ApiOkResponse({
    description: 'List of all markers',
    type: [Marker],
  })
  async findAll(): Promise<Marker> {
    return this.markersService.findAll()
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get marker by ID' })
  @ApiParam({
    name: 'id',
    description: 'Marker ID',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiOkResponse({ description: 'Marker found', type: Marker })
  @ApiNotFoundResponse({ description: 'Marker not found' })
  @ApiBadRequestResponse({ description: 'Invalid marker ID' })
  async findById(@Param('id') id: string): Promise<Marker> {
    return this.markersService.findById(id)
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update marker' })
  @ApiParam({
    name: 'id',
    description: 'Marker ID',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiBody({ type: UpdateMarkerDto })
  @ApiOkResponse({ description: 'Marker successfully updated', type: Marker })
  @ApiNotFoundResponse({ description: 'Marker not found' })
  @ApiBadRequestResponse({ description: 'Invalid input data' }) 
  async update(
    @Param('id') id: string,
    @Body() updateMarkerDto: UpdateMarkerDto,
  ): Promise<Marker> {
    return this.markersService.update(id, updateMarkerDto)
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete marker' })
  @ApiParam({
    name: 'id',
    description: 'Marker ID',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiNoContentResponse({ description: 'Marker successfully deleted' })
  @ApiNotFoundResponse({ description: 'Marker not found' })
  @ApiBadRequestResponse({ description: 'Invalid marker ID' })
  async delete(@Param('id') id: string): Promise<void> {
    return this.markersService.delete(id)
  }
}
