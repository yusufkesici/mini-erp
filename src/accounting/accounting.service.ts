import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateAccountingEntryDto } from './dto/create-accounting-entry.dto.js';
import { Prisma } from '../generated/prisma/client.js';

@Injectable()
export class AccountingService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateAccountingEntryDto) {
    return this.prisma.accountingEntry.create({
      data: { ...dto, entryDate: dto.entryDate ? new Date(dto.entryDate) : undefined },
    });
  }

  findAll() {
    return this.prisma.accountingEntry.findMany({ orderBy: { entryDate: 'desc' } });
  }

  async findOne(id: string) {
    const entry = await this.prisma.accountingEntry.findUnique({ where: { id } });
    if (!entry) {
      throw new NotFoundException(`Muhasebe kaydı ${id} bulunamadı`);
    }
    return entry;
  }

  async summary() {
    const totals = await this.prisma.accountingEntry.groupBy({ by: ['type'], _sum: { amount: true } });
    const totalIncome = totals.find((t) => t.type === 'INCOME')?._sum.amount ?? new Prisma.Decimal(0);
    const totalExpense = totals.find((t) => t.type === 'EXPENSE')?._sum.amount ?? new Prisma.Decimal(0);
    return {
      totalIncome,
      totalExpense,
      balance: totalIncome.minus(totalExpense),
    };
  }
}
