import { Injectable, Logger } from '@nestjs/common'
import { IdTagInfoDto } from '../dto/authorize.dto'

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name)
  private authorizedTags: Map<string, IdTagInfoDto> = new Map()
  private readonly defaultExpiryDays: number = parseInt(
    process.env.DEFAULT_TAG_EXPIRY_DAYS || '365',
    10,
  )

  constructor() {
    // Initialize with some default authorized tags for testing
    this.authorizedTags.set('RFID123456789', {
      status: 'Accepted',
      expiryDate: new Date(
        Date.now() + this.defaultExpiryDays * 24 * 60 * 60 * 1000,
      ).toISOString(),
    })

    // Load authorized tags from environment variable if provided
    const envTags = process.env.AUTHORIZED_TAGS
    if (envTags) {
      try {
        const tags = JSON.parse(envTags)
        Object.entries(tags).forEach(([tag, info]: [string, any]) => {
          this.authorizedTags.set(tag, info as IdTagInfoDto)
        })
        this.logger.log(
          `Loaded ${this.authorizedTags.size} authorized tags from environment`,
        )
      } catch (error) {
        this.logger.warn(
          `Failed to parse AUTHORIZED_TAGS from environment: ${error.message}`,
        )
      }
    }
  }

  authorize(idTag: string): IdTagInfoDto {
    // Check if tag exists in authorized list
    const tagInfo = this.authorizedTags.get(idTag)
    if (tagInfo) {
      // Check if tag is expired
      if (tagInfo.expiryDate) {
        const expiryDate = new Date(tagInfo.expiryDate)
        if (expiryDate < new Date()) {
          this.logger.warn(`Tag ${idTag} has expired`)
          return {
            status: 'Expired',
            expiryDate: tagInfo.expiryDate,
          }
        }
      }
      return tagInfo
    }

    // Default behavior: accept all tags (can be changed via environment variable)
    const acceptAllTags = process.env.ACCEPT_ALL_TAGS !== 'false'
    if (acceptAllTags) {
      this.logger.debug(
        `Tag ${idTag} not in authorized list, accepting by default`,
      )
      return {
        status: 'Accepted',
        expiryDate: new Date(
          Date.now() + this.defaultExpiryDays * 24 * 60 * 60 * 1000,
        ).toISOString(),
        parentIdTag: idTag,
      }
    }

    // Reject if not in authorized list and ACCEPT_ALL_TAGS is false
    this.logger.warn(`Tag ${idTag} not authorized`)
    return {
      status: 'Invalid',
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
