import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Download, X, Smartphone } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function InstallPWAButton() {
    const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
    const [showInstallButton, setShowInstallButton] = useState(false);
    const [showInstructions, setShowInstructions] = useState(false);
    const [deviceInfo, setDeviceInfo] = useState({
        isIOS: false,
        isAndroid: false,
        isSafari: false,
        isChrome: false,
        isStandalone: false,
    });

    useEffect(() => {
        // Detect device and browser
        const userAgent = window.navigator.userAgent.toLowerCase();
        const isIOS = /iphone|ipad|ipod/.test(userAgent);
        const isAndroid = /android/.test(userAgent);
        const isSafari = /safari/.test(userAgent) && !/chrome/.test(userAgent);
        const isChrome = /chrome/.test(userAgent);
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches;

        setDeviceInfo({
            isIOS,
            isAndroid,
            isSafari,
            isChrome,
            isStandalone,
        });

        // Don't show button if already installed
        if (isStandalone) {
            setShowInstallButton(false);
            return;
        }

        // For iOS, always show instructions button
        if (isIOS) {
            setShowInstallButton(true);
            return;
        }

        // For Android/Desktop, listen for beforeinstallprompt
        const handleBeforeInstallPrompt = (e: Event) => {
            e.preventDefault();
            setDeferredPrompt(e as BeforeInstallPromptEvent);
            setShowInstallButton(true);
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        };
    }, []);

    const handleInstallClick = async () => {
        if (deviceInfo.isIOS) {
            // iOS doesn't support beforeinstallprompt, show instructions
            setShowInstructions(true);
            return;
        }

        if (!deferredPrompt) {
            // No install prompt available, show instructions
            setShowInstructions(true);
            return;
        }

        // Show install prompt for Android/Desktop
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;

        if (outcome === 'accepted') {
            setDeferredPrompt(null);
            setShowInstallButton(false);
        }
    };

    const getInstructions = () => {
        if (deviceInfo.isIOS && deviceInfo.isSafari) {
            return {
                title: 'Instalar en iPhone (Safari)',
                steps: [
                    'Toca el botón "Compartir" (cuadrado con flecha hacia arriba) en la parte inferior',
                    'Desplázate hacia abajo y toca "Agregar a pantalla de inicio"',
                    'Toca "Agregar" en la esquina superior derecha',
                    'La app aparecerá en tu pantalla de inicio'
                ]
            };
        }

        if (deviceInfo.isIOS && deviceInfo.isChrome) {
            return {
                title: 'Instalar en iPhone (Chrome)',
                steps: [
                    'Toca el menú (tres puntos) en la esquina superior derecha',
                    'Toca "Agregar a pantalla de inicio"',
                    'Toca "Agregar"',
                    'La app aparecerá en tu pantalla de inicio'
                ]
            };
        }

        if (deviceInfo.isAndroid) {
            return {
                title: 'Instalar en Android',
                steps: [
                    'Toca el botón "Instalar" que aparece en la parte superior',
                    'O toca el menú (tres puntos) y selecciona "Instalar aplicación"',
                    'Confirma la instalación',
                    'La app aparecerá en tu pantalla de inicio'
                ]
            };
        }

        return {
            title: 'Instalar Aplicación',
            steps: [
                'Haz clic en el icono de instalación en la barra de direcciones',
                'O usa el menú del navegador y selecciona "Instalar"',
                'Confirma la instalación',
                'La app aparecerá como una aplicación independiente'
            ]
        };
    };

    if (!showInstallButton) return null;

    const instructions = getInstructions();

    return (
        <>
            {/* Floating Install Button */}
            <div className="fixed bottom-6 right-6 z-50 animate-bounce">
                <Button
                    onClick={handleInstallClick}
                    className="h-14 px-6 rounded-full shadow-2xl bg-gradient-to-r from-hotel-wine-600 to-hotel-wine-700 hover:from-hotel-wine-700 hover:to-hotel-wine-800 text-white font-semibold flex items-center gap-2"
                >
                    <Download className="h-5 w-5" />
                    <span className="hidden sm:inline">Instalar App</span>
                    <Smartphone className="h-5 w-5 sm:hidden" />
                </Button>
            </div>

            {/* Instructions Dialog */}
            <Dialog open={showInstructions} onOpenChange={setShowInstructions}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Download className="h-5 w-5 text-hotel-wine-600" />
                            {instructions.title}
                        </DialogTitle>
                        <DialogDescription>
                            Sigue estos pasos para instalar la aplicación en tu dispositivo
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                        <div className="bg-blue-50 dark:bg-blue-950/30 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                            <p className="text-sm font-semibold text-blue-800 dark:text-blue-400 mb-2">
                                📱 Pasos para instalar:
                            </p>
                            <ol className="space-y-2 text-sm text-blue-700 dark:text-blue-300">
                                {instructions.steps.map((step, index) => (
                                    <li key={index} className="flex gap-2">
                                        <span className="font-bold min-w-[20px]">{index + 1}.</span>
                                        <span>{step}</span>
                                    </li>
                                ))}
                            </ol>
                        </div>

                        <div className="bg-green-50 dark:bg-green-950/30 p-3 rounded-lg border border-green-200 dark:border-green-800">
                            <p className="text-xs text-green-700 dark:text-green-400">
                                ✅ Una vez instalada, podrás acceder a la app desde tu pantalla de inicio como cualquier otra aplicación.
                            </p>
                        </div>
                    </div>

                    <div className="flex justify-end">
                        <Button
                            variant="outline"
                            onClick={() => setShowInstructions(false)}
                            className="gap-2"
                        >
                            <X className="h-4 w-4" />
                            Cerrar
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
