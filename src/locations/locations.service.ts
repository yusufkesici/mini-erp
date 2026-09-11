import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { Prisma } from '../generated/prisma/client.js';
import { CreateLocationDto } from './dto/create-location.dto.js';
import { UpdateLocationDto } from './dto/update-location.dto.js';

@Injectable()
export class LocationsService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateLocationDto) {
    return this.prisma.location.create({ data: dto });
  }

  findAll() {
    return this.prisma.location.findMany({ include: { warehouse: true } });
  }

  async findOne(id: string) {
    const location = await this.prisma.location.findUnique({
      where: { id },
      include: { warehouse: true },
    });
    if (!location) {
      throw new NotFoundException(`Konum ${id} bulunamadı`);
    }
    return location;
  }

  async findByCode(code: string) {
    const location = await this.prisma.location.findUnique({
      where: { code },
      include: { warehouse: true },
    });
    if (!location) {
      throw new NotFoundException(`Barkodu "${code}" olan bir konum bulunamadı`);
    }
    return location;
  }

  async update(id: string, dto: UpdateLocationDto) {
    await this.findOne(id);
    return this.prisma.location.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.location.update({ where: { id }, data: { isActive: false } });
  }

  // Üretim emri / satış siparişi gibi depo-seviyeli akışlar raf seçmeden çalışabilsin diye:
  // her Warehouse'un otomatik bir "Genel Alan" konumu olmasını garanti eder — yoksa ilk
  // erişimde (lazy) oluşturur. WarehousesService'e bağımlı DEĞİLDİR (döngüsel modül
  // bağımlılığından kaçınmak için doğrudan Prisma üzerinden depo koduna bakar). İki eşzamanlı
  // çağrı aynı anda "yok" görüp ikisi de create denerse (code @unique çakışması), ikinci
  // çağrı P2002'yi yakalayıp az önce oluşturulan satırı bulur — kayıp/çift kayıt olmaz.
  async findDefaultForWarehouse(warehouseId: string) {
    const existing = await this.prisma.location.findFirst({
      where: { warehouseId, isDefault: true },
    });
    if (existing) return existing;

    const warehouse = await this.prisma.warehouse.findUnique({
      where: { id: warehouseId },
    });
    if (!warehouse) {
      throw new NotFoundException(`Depo ${warehouseId} bulunamadı`);
    }

    try {
      return await this.prisma.location.create({
        data: {
          code: `LOC-${warehouse.code}-GENEL`,
          name: 'Genel Alan',
          isDefault: true,
          warehouseId,
        },
      });
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        const raceWinner = await this.prisma.location.findFirst({
          where: { warehouseId, isDefault: true },
        });
        if (raceWinner) return raceWinner;
      }
      throw err;
    }
  }
}
