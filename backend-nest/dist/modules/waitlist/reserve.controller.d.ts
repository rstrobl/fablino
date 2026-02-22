import { PrismaService } from '../prisma/prisma.service';
import { ReserveDto } from '../../dto/reserve.dto';
export declare class ReserveController {
    private readonly prisma;
    constructor(prisma: PrismaService);
    reserve(dto: ReserveDto): Promise<{
        ok: boolean;
        storyId: `${string}-${string}-${string}-${string}-${string}`;
    }>;
}
