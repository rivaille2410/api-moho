import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { EventEmitterModule } from '@nestjs/event-emitter';

import configuration from './config/configuration';
import { envValidationSchema } from './config/env.validation';

import { LoggingInterceptor } from './common/interceptors';
import { CloudinaryModule } from './common/cloudinary/cloudinary.module';
import { HttpExceptionFilter, PrismaExceptionFilter } from './common/filters';

import { JwtAuthGuard } from './modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from './modules/auth/guards/roles.guard';
import { PrismaModule } from './prisma/prisma.module';

import { AuthModule } from './modules/auth/auth.module';
import { CartModule } from './modules/cart/cart.module';
import { MailModule } from './modules/mail/mail.module';
import { PostsModule } from './modules/posts/posts.module';
import { UsersModule } from './modules/users/users.module';
import { HealthModule } from './modules/health/health.module';
import { OrdersModule } from './modules/orders/orders.module';
import { ReviewsModule } from './modules/reviews/reviews.module';
import { UploadsModule } from './modules/uploads/uploads.module';
import { ProductsModule } from './modules/products/products.module';
import { CommentsModule } from './modules/comments/comments.module';
import { VouchersModule } from './modules/vouchers/vouchers.module';
import { ShippingModule } from './modules/shipping/shipping.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { AddressesModule } from './modules/addresses/addresses.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { ReturnRequestsModule } from './modules/return-requests/return-requests.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validationSchema: envValidationSchema,
    }),
    EventEmitterModule.forRoot(),
    PrismaModule,
    CloudinaryModule,
    HealthModule,
    MailModule,
    AuthModule,
    UsersModule,
    CategoriesModule,
    ProductsModule,
    PostsModule,
    CartModule,
    OrdersModule,
    ReviewsModule,
    CommentsModule,
    VouchersModule,
    ShippingModule,
    AddressesModule,
    InventoryModule,
    DashboardModule,
    UploadsModule,
    NotificationsModule,
    ReturnRequestsModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_FILTER, useClass: PrismaExceptionFilter },
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
  ],
})
export class AppModule {}
