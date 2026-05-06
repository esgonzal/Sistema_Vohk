import { Injectable } from '@angular/core';
import { Device, Call } from '@twilio/voice-sdk';
import { BehaviorSubject } from 'rxjs';

export type EstadoLlamada = 'inactivo' | 'entrante' | 'activo';

@Injectable({ providedIn: 'root' })
export class TwilioVoiceService {

  // Observables que el componente escucha
  estado$ = new BehaviorSubject<EstadoLlamada>('inactivo');
  origen$ = new BehaviorSubject<string>('');

  private device: Device | null = null;
  private llamadaActual: Call | null = null;

  // ─── Inicializar el Device (llamar al cargar la app) ───────────
  async inicializar(): Promise<void> {
    try {
      // 1. Obtener token del backend
      const res = await fetch('https://api.vohk.cl/twilio/token');
      const { token } = await res.json();

      // 2. Crear el Device de Twilio
      this.device = new Device(token, {
        logLevel: 1,
        codecPreferences: ['opus', 'pcmu'] as any
      });

      // 3. Escuchar llamadas entrantes
      this.device.on('incoming', (call: Call) => {
        this.llamadaActual = call;
        this.origen$.next(call.parameters['From'] || 'Frente desconocido');
        this.estado$.next('entrante');

        call.on('cancel', () => this.resetear());
        call.on('disconnect', () => this.resetear());
      });

      // 4. Registrar el device para recibir llamadas
      await this.device.register();
      console.log('✅ Twilio Voice listo — esperando llamadas');

    } catch (error) {
      console.error('❌ Error inicializando Twilio Voice:', error);
    }
  }

  // ─── Contestar llamada entrante ────────────────────────────────
  contestar(): void {
    this.llamadaActual?.accept();
    this.estado$.next('activo');
  }

  // ─── Rechazar llamada entrante ─────────────────────────────────
  rechazar(): void {
    this.llamadaActual?.reject();
    this.resetear();
  }

  // ─── Colgar llamada activa ─────────────────────────────────────
  colgar(): void {
    this.llamadaActual?.disconnect();
    this.resetear();
  }

  // ─── Reset estado ──────────────────────────────────────────────
  private resetear(): void {
    this.llamadaActual = null;
    this.estado$.next('inactivo');
    this.origen$.next('');
  }
}