import { TtsService } from '../../services/tts.service';
export declare class VoicesService {
    private ttsService;
    constructor(ttsService: TtsService);
    getVoices(): {
        [key: string]: import("../../services/tts.service").VoiceInfo;
    };
}
