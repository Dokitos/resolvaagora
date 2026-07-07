import {
  Controller,
  Get,
  Patch,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/presentation/guards/jwt-auth.guard';
import { Roles } from '../../auth/presentation/decorators/roles.decorator';
import { RolesGuard } from '../../auth/presentation/guards/roles.guard';
import { CurrentUser } from '../../auth/presentation/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../auth/infrastructure/jwt.strategy';
import { GetProfileUseCase } from '../application/use-cases/get-profile.use-case';
import { UpdateProfileUseCase } from '../application/use-cases/update-profile.use-case';
import { ManageAddressUseCase } from '../application/use-cases/manage-address.use-case';
import { UpdateProfileDto } from '../application/dto/update-profile.dto';
import { CreateAddressDto, UpdateAddressDto } from '../application/dto/address.dto';

@Controller('clients')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('CLIENT')
export class UsersController {
  constructor(
    private readonly getProfile: GetProfileUseCase,
    private readonly updateProfile: UpdateProfileUseCase,
    private readonly manageAddress: ManageAddressUseCase,
  ) {}

  @Get('me')
  profile(@CurrentUser() user: AuthenticatedUser) {
    return this.getProfile.execute(user.id);
  }

  @Patch('me')
  update(@CurrentUser() user: AuthenticatedUser, @Body() dto: UpdateProfileDto) {
    return this.updateProfile.execute(user.id, dto);
  }

  @Get('me/addresses')
  listAddresses(@CurrentUser() user: AuthenticatedUser) {
    return this.manageAddress.list(user.id);
  }

  @Post('me/addresses')
  @HttpCode(HttpStatus.CREATED)
  createAddress(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateAddressDto) {
    return this.manageAddress.create(user.id, dto);
  }

  @Patch('me/addresses/:id')
  updateAddress(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateAddressDto,
  ) {
    return this.manageAddress.update(user.id, id, dto);
  }

  @Delete('me/addresses/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeAddress(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.manageAddress.remove(user.id, id);
  }
}
