import { Module } from '@nestjs/common';

import { ReturnRequestsService } from './return-requests.service';
import { ReturnRequestsController } from './return-requests.controller';
import { AdminReturnRequestsController } from './admin-return-requests.controller';

@Module({
  controllers: [ReturnRequestsController, AdminReturnRequestsController],
  providers: [ReturnRequestsService],
  exports: [ReturnRequestsService],
})
export class ReturnRequestsModule {}
