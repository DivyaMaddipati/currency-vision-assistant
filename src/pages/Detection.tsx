
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Camera, StopCircle, Volume2, VolumeX, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useSpeech } from "@/hooks/useSpeech";
import { useTranslation } from "@/hooks/useTranslation";
import CurrencyDetection from "@/components/CurrencyDetection";

interface DetectedObject {
  label: string;
  confidence: number;
  position: string;
  distance: string | null;
  box: number[];
}

interface DetectionResponse {
  objects: DetectedObject[];
  person_count: number;
  frame_height: number;
  frame_width: number;
}

const Detection = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { speak, speaking, supported, cancel } = useSpeech();
  const { translate } = useTranslation();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isActive, setIsActive] = useState(false);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [userLanguage, setUserLanguage] = useState("en");
  const [isModelLoading, setIsModelLoading] = useState(true);
  const lastSpokenTimeRef = useRef(Date.now());
  const lastDetectionRef = useRef<string>("");
  const [currentAnnouncement, setCurrentAnnouncement] = useState<string>("");
  const animationFrameRef = useRef<number>();

  // Load user's language preference
  useEffect(() => {
    const fetchUserLanguage = async () => {
      try {
        setIsModelLoading(true);
        const response = await fetch('http://localhost:5000/api/profile');
        const data = await response.json();
        if (response.ok && data.language) {
          setUserLanguage(data.language);
          console.log("User language set to:", data.language);
        }
        
        // Check model status
        const modelResponse = await fetch('http://localhost:5000/api/model_status');
        if (modelResponse.ok) {
          setIsModelLoading(false);
          console.log("Models are ready");
        }
      } catch (error) {
        console.error('Error loading language preference or checking model status:', error);
        setIsModelLoading(false); // Fallback in case of error
      }
    };
    fetchUserLanguage();
  }, []);

  // Effect to handle muting
  useEffect(() => {
    if (isMuted) {
      cancel();
      setCurrentAnnouncement("");
    }
  }, [isMuted, cancel]);

  const translateAndSpeak = async (text: string) => {
    if (!supported || isMuted) return;
    
    try {
      const translatedText = userLanguage !== "en" 
        ? await translate(text, userLanguage)
        : text;
      
      // Pass both the translated text and language to the speak function
      speak(translatedText, userLanguage);
      setCurrentAnnouncement(translatedText);
    } catch (error) {
      console.error('Translation error:', error);
      speak(text, 'en'); // Fallback to English if translation fails
      setCurrentAnnouncement(text);
    }
  };

  const announceDetection = async (objects: DetectedObject[], personCount: number) => {
    if (!supported || isMuted) return;

    const now = Date.now();
    if (now - lastSpokenTimeRef.current < 3000) return;

    // Create separate announcement for people count
    if (personCount > 0) {
      const personAnnouncement = `${personCount} ${personCount === 1 ? 'person' : 'people'} detected`;
      await translateAndSpeak(personAnnouncement);
    }

    // Announce each object separately
    for (const obj of objects) {
      const objAnnouncement = `${obj.label} detected ${obj.distance ? `${obj.distance} away` : ''} to your ${obj.position}`;
      
      // Make sure this is a different announcement from the last one
      if (objAnnouncement !== lastDetectionRef.current) {
        await translateAndSpeak(objAnnouncement);
        lastDetectionRef.current = objAnnouncement;
      }
    }

    lastSpokenTimeRef.current = now;
  };

  const detectFrame = async (videoElement: HTMLVideoElement) => {
    if (!videoElement || !canvasRef.current) return;
    
    const canvas = document.createElement('canvas');
    canvas.width = videoElement.videoWidth;
    canvas.height = videoElement.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.drawImage(videoElement, 0, 0);
    const base64Frame = canvas.toDataURL('image/jpeg');

    try {
      const response = await fetch('http://localhost:5000/detect_frame', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ frame: base64Frame }),
      });

      if (!response.ok) throw new Error('Frame detection failed');

      const data: DetectionResponse = await response.json();
      
      const canvasCtx = canvasRef.current.getContext('2d');
      if (canvasCtx) {
        canvasCtx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        data.objects.forEach(obj => {
          const [x, y, x2, y2] = obj.box;
          canvasCtx.strokeStyle = '#00ff00';
          canvasCtx.lineWidth = 2;
          canvasCtx.strokeRect(x, y, x2 - x, y2 - y);
          
          canvasCtx.fillStyle = '#00ff00';
          canvasCtx.font = '16px Arial';
          canvasCtx.fillText(
            `${obj.label} ${obj.distance || ''}`,
            x,
            y - 5
          );
        });
      }

      announceDetection(data.objects, data.person_count);

    } catch (error) {
      console.error('Frame detection error:', error);
    }
  };

  const startCamera = async () => {
    if (isModelLoading) {
      toast({
        title: "Models Loading",
        description: "Please wait while models are being initialized.",
        variant: "default",
      });
      return;
    }
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: "environment",
          width: { ideal: 640 },
          height: { ideal: 480 }
        } 
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          setVideoLoaded(true);
          if (canvasRef.current) {
            canvasRef.current.width = videoRef.current!.videoWidth;
            canvasRef.current.height = videoRef.current!.videoHeight;
          }
        };
        setIsActive(true);
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
      toast({
        title: "Error",
        description: "Failed to access camera",
        variant: "destructive",
      });
    }
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
      setIsActive(false);
      setVideoLoaded(false);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      cancel(); // Cancel any ongoing speech
      setCurrentAnnouncement(""); // Clear the current announcement
      lastDetectionRef.current = ""; // Reset last detection
      lastSpokenTimeRef.current = Date.now(); // Reset timer
    }
  };

  useEffect(() => {
    const detect = async () => {
      if (!videoRef.current || !canvasRef.current || !isActive || !videoLoaded) return;

      if (videoRef.current.readyState !== 4) {
        animationFrameRef.current = requestAnimationFrame(detect);
        return;
      }

      await detectFrame(videoRef.current);
      animationFrameRef.current = requestAnimationFrame(detect);
    };

    if (isActive && videoLoaded) {
      detect();
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isActive, videoLoaded]);

  return (
    <div className="min-h-screen p-4 bg-gradient-to-b from-gray-900 via-blue-900 to-gray-900">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between mb-6">
          <Button
            variant="ghost"
            className="text-white hover:text-blue-300 transition-colors"
            onClick={() => {
              stopCamera();
              navigate("/");
            }}
          >
            ← Back
          </Button>
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="bg-white/10 hover:bg-white/20 transition-all"
              onClick={() => setIsMuted(!isMuted)}
            >
              {isMuted ? 
                <VolumeX className="h-5 w-5 text-red-400" /> : 
                <Volume2 className="h-5 w-5 text-green-400" />
              }
            </Button>
          </div>
        </div>

        <Card className="bg-black/30 border-none shadow-xl backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-white">Object Detection</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative aspect-video w-full overflow-hidden rounded-lg border-2 border-blue-500/30">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              <canvas
                ref={canvasRef}
                className="absolute inset-0 w-full h-full"
              />
              {!isActive && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm">
                  <Button
                    size="lg"
                    className="text-xl bg-blue-600 hover:bg-blue-700 transition-colors"
                    onClick={startCamera}
                    disabled={isModelLoading}
                  >
                    {isModelLoading ? (
                      <>
                        <Loader2 className="mr-2 h-6 w-6 animate-spin" />
                        Initializing Models...
                      </>
                    ) : (
                      <>
                        <Camera className="mr-2 h-6 w-6" />
                        Start Camera
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>
            {currentAnnouncement && !isMuted && (
              <div className="mt-4 p-4 rounded-lg bg-white/10 backdrop-blur-sm">
                <p className="text-white text-sm">{currentAnnouncement}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <CurrencyDetection onSpeak={text => !isMuted && translateAndSpeak(text)} />

        {isActive && (
          <Button
            variant="destructive"
            size="lg"
            className="mt-6 w-full text-xl transition-all hover:bg-red-600"
            onClick={stopCamera}
          >
            <StopCircle className="mr-2 h-6 w-6" />
            Stop Camera
          </Button>
        )}
      </div>
    </div>
  );
};

export default Detection;
