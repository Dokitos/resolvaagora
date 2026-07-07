import { Module } from '@nestjs/common';
import { UsersController } from './presentation/users.controller';
import { GetProfileUseCase } from './application/use-cases/get-profile.use-case';
import { UpdateProfileUseCase } from './application/use-cases/update-profile.use-case';
import { ManageAddressUseCase } from './application/use-cases/manage-address.use-case';

@Module({
  controllers: [UsersController],
  providers: [GetProfileUseCase, UpdateProfileUseCase, ManageAddressUseCase],
})
export class UsersModule {}
