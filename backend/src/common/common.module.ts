import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { DatabaseModule } from './database.module';

@Global()
@Module({
  imports: [DatabaseModule],
  providers: [PrismaService],
  exports: [PrismaService, DatabaseModule],
})
export class CommonModule {}
