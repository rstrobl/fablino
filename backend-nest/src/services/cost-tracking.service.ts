import { Injectable } from '@nestjs/common';
import { PrismaService } from '../modules/prisma/prisma.service';

// Pricing per 1M tokens (USD)
const PRICING = {
  'claude-opus-4': { input: 15, output: 75 },
  'claude-sonnet-4': { input: 3, output: 15 },
};

// ElevenLabs Pro Plan: $99/Mo for 500K chars = $0.198/1K chars
const ELEVENLABS_PER_CHAR = 0.000198;

// Replicate Flux: ~$0.04 per image
const REPLICATE_PER_IMAGE = 0.04;

@Injectable()
export class CostTrackingService {
  constructor(private prisma: PrismaService) {}

  async trackClaude(
    storyId: string,
    operation: string,
    usage: { input_tokens: number; output_tokens: number },
    thinkingTokens?: number,
    model: string = 'claude-opus-4',
  ) {
    const pricing = PRICING[model] || PRICING['claude-opus-4'];
    const inputCost = (usage.input_tokens / 1_000_000) * pricing.input;
    const outputCost = (usage.output_tokens / 1_000_000) * pricing.output;
    const totalCost = inputCost + outputCost;

    await this.prisma.cost.create({
      data: {
        storyId,
        service: 'claude',
        operation,
        inputTokens: usage.input_tokens,
        outputTokens: usage.output_tokens,
        thinkingTokens: thinkingTokens || null,
        costUsd: totalCost,
        metadata: { model } as any,
      },
    });

    console.log(`💰 Claude [${operation}]: ${usage.input_tokens}in + ${usage.output_tokens}out${thinkingTokens ? ` (${thinkingTokens} thinking)` : ''} = $${totalCost.toFixed(4)}`);
    return totalCost;
  }

  async trackElevenLabs(
    storyId: string,
    operation: string,
    characterCount: number,
  ) {
    const costUsd = characterCount * ELEVENLABS_PER_CHAR;

    await this.prisma.cost.create({
      data: {
        storyId,
        service: 'elevenlabs',
        operation,
        characters: characterCount,
        costUsd,
      },
    });

    console.log(`💰 ElevenLabs [${operation}]: ${characterCount} chars = $${costUsd.toFixed(4)}`);
    return costUsd;
  }

  async trackReplicate(
    storyId: string,
    operation: string,
    imageCount: number = 1,
  ) {
    const costUsd = imageCount * REPLICATE_PER_IMAGE;

    await this.prisma.cost.create({
      data: {
        storyId,
        service: 'replicate',
        operation,
        costUsd,
        metadata: { imageCount } as any,
      },
    });

    console.log(`💰 Replicate [${operation}]: ${imageCount} images = $${costUsd.toFixed(4)}`);
    return costUsd;
  }

  async getStoryCosts(storyId: string) {
    const costs = await this.prisma.cost.findMany({
      where: { storyId },
      orderBy: { createdAt: 'asc' },
    });

    const totals = { claude: 0, elevenlabs: 0, replicate: 0, total: 0 };
    for (const c of costs) {
      const amount = Number(c.costUsd) || 0;
      totals[c.service] = (totals[c.service] || 0) + amount;
      totals.total += amount;
    }

    return { costs, totals };
  }
}
