import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model, Types } from 'mongoose'
import { Marker, MarkerDocument } from './schemas/marker.schema'
import { Charger, ChargerDocument } from '../ocpp/schemas/charger.schema'
import { CreateMarkerDto } from './dto/create-marker.dto'
import { UpdateMarkerDto } from './dto/update-marker.dto'

@Injectable()
export class MarkersService {
  private readonly logger = new Logger(MarkersService.name)

  constructor(
    @InjectModel(Marker.name) private markerModel: Model<MarkerDocument>,
    @InjectModel(Charger.name) private chargerModel: Model<ChargerDocument>,
  ) {}

  async create(createMarkerDto: CreateMarkerDto): Promise<Marker> {
    const marker = new this.markerModel({
      name: createMarkerDto.name,
      latitude: createMarkerDto.latitude,
      longitude: createMarkerDto.longitude,
      description: createMarkerDto.description,
      address: createMarkerDto.address,
      chargerIds: createMarkerDto.chargerIds
        ? createMarkerDto.chargerIds.map((id) => new Types.ObjectId(id))
        : [],
    })

    await marker.save()
    this.logger.log(`Marker created: ${marker.name}`)
    return marker.toObject()
  }

  async findAll(): Promise<Marker> {
    return this.markerModel
      .findOne()
      .populate({
        path: 'chargerIds',
        model: 'Charger',
        populate: {
          path: 'connectors',
          model: 'Connector',
        },
      })
      .lean()
  }

  async findById(id: string): Promise<Marker> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException(`Invalid marker ID: ${id}`)
    }

    const marker = await this.markerModel
      .findOne({ _id: new Types.ObjectId(id) })
      .lean()

    if (!marker) {
      throw new NotFoundException(`Marker with ID ${id} not found`)
    }

    return marker as Marker
  }

  async update(id: string, updateMarkerDto: UpdateMarkerDto): Promise<Marker> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException(`Invalid marker ID: ${id}`)
    }

    const marker = await this.markerModel.findById(id)

    if (!marker) {
      throw new NotFoundException(`Marker with ID ${id} not found`)
    }

    if (updateMarkerDto.name !== undefined) {
      marker.set('name', updateMarkerDto.name)
    }
    if (updateMarkerDto.latitude !== undefined) {
      marker.set('latitude', updateMarkerDto.latitude)
    }
    if (updateMarkerDto.longitude !== undefined) {
      marker.set('longitude', updateMarkerDto.longitude)
    }
    if (updateMarkerDto.description !== undefined) {
      marker.set('description', updateMarkerDto.description)
    }
    if (updateMarkerDto.address !== undefined) {
      marker.set('address', updateMarkerDto.address)
    }
    if (updateMarkerDto.chargerIds !== undefined) {
      marker.set(
        'chargerIds',
        updateMarkerDto.chargerIds.map((id) => new Types.ObjectId(id)),
      )
    }
    await marker.save()
    this.logger.log(`Marker updated: ${marker.name}`)
    return marker.toObject()
  }

  async delete(id: string): Promise<void> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException(`Invalid marker ID: ${id}`)
    }

    const marker = await this.markerModel.findById(id)

    if (!marker) {
      throw new NotFoundException(`Marker with ID ${id} not found`)
    }

    await this.markerModel.deleteOne({ _id: id })
    this.logger.log(`Marker deleted: ${marker.name}`)
  }
}
