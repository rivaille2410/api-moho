import { Module } from '@nestjs/common';

import { ReturnRequestsService } from './return-requests.service';
import { ReturnRequestsController } from './return-requests.controller';
import { CloudinaryModule } from '@/common/cloudinary/cloudinary.module';
import { AdminReturnRequestsController } from './admin-return-requests.controller';

@Module({
  imports: [CloudinaryModule],
  controllers: [ReturnRequestsController, AdminReturnRequestsController],
  providers: [ReturnRequestsService],
  exports: [ReturnRequestsService],
})
export class ReturnRequestsModule {}
