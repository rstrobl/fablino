import { VoicesService } from './voices.service';
export declare class VoicesController {
    private readonly voicesService;
    constructor(voicesService: VoicesService);
    getVoices(): {
        [key: string]: import("../../services/tts.service").VoiceInfo;
    };
}
