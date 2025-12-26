import { Injectable, Logger } from '@nestjs/common'
import { IdTagInfoDto } from '../dto/authorize.dto'

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name)
  private authorizedTags: Map<string, IdTagInfoDto> = new Map()

  constructor() {
    // Initialize with some default authorized tags for testing
    this.authorizedTags.set('RFID123456789', {
      status: 'Accepted',
      expiryDate: new Date(
        Date.now() + 365 * 24 * 60 * 60 * 1000,
      ).toISOString(),
    })
  }

  authorize(idTag: string): IdTagInfoDto {
    return {
      status: 'Accepted',
      expiryDate: new Date(
        Date.now() + 365 * 24 * 60 * 60 * 1000,
      ).toISOString(),
      parentIdTag: idTag,
    }
  }

  addAuthorizedTag(idTag: string, tagInfo: IdTagInfoDto): void {
    this.authorizedTags.set(idTag, tagInfo)
    this.logger.log(`Added authorized tag: ${idTag}`)
  }

  removeAuthorizedTag(idTag: string): void {
    this.authorizedTags.delete(idTag)
    this.logger.log(`Removed authorized tag: ${idTag}`)
  }

  getAllAuthorizedTags(): Map<string, IdTagInfoDto> {
    return this.authorizedTags
  }
}
