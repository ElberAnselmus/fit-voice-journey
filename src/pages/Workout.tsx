import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { 
  Mic, 
  MicOff, 
  Plus, 
  Minus, 
  Save, 
  Play, 
  Pause, 
  RotateCcw,
  Dumbbell,
  Timer as TimerIcon 
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface Exercise {
  name: string;
  sets: number;
  reps: number;
  weight: number;
  restTime: number;
}

interface WorkoutSession {
  title: string;
  exercises: Exercise[];
  notes: string;
}

const Workout = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Session state
  const [session, setSession] = useState<WorkoutSession>({
    title: '',
    exercises: [],
    notes: ''
  });
  
  // Current exercise tracking
  const [currentExercise, setCurrentExercise] = useState<Exercise>({
    name: '',
    sets: 0,
    reps: 0,
    weight: 0,
    restTime: 60
  });
  
  // Voice recognition state
  const [isListening, setIsListening] = useState(false);
  const [recognition, setRecognition] = useState<SpeechRecognition | null>(null);
  const [currentReps, setCurrentReps] = useState(0);
  const [currentSets, setCurrentSets] = useState(0);
  
  // Rest timer state
  const [restTime, setRestTime] = useState(0);
  const [isResting, setIsResting] = useState(false);
  
  // Workout timer
  const [workoutStartTime, setWorkoutStartTime] = useState<Date | null>(null);
  const [workoutDuration, setWorkoutDuration] = useState(0);

  // Initialize speech recognition
  useEffect(() => {
    if (typeof window !== 'undefined' && 'webkitSpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      const recognitionInstance = new SpeechRecognition();
      
      recognitionInstance.continuous = true;
      recognitionInstance.interimResults = true;
      recognitionInstance.lang = 'en-US';
      
      recognitionInstance.onresult = (event) => {
        const transcript = event.results[event.results.length - 1][0].transcript.toLowerCase().trim();
        
        // Listen for rep counting commands
        if (transcript.includes('rep') || transcript.includes('one') || transcript === '1') {
          incrementReps();
        } else if (transcript.includes('set') || transcript.includes('next set')) {
          completeSet();
        } else if (transcript.includes('reset')) {
          resetCurrentExercise();
        }
      };
      
      recognitionInstance.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
      };
      
      recognitionInstance.onend = () => {
        setIsListening(false);
      };
      
      setRecognition(recognitionInstance);
    }
  }, []);

  // Rest timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isResting && restTime > 0) {
      interval = setInterval(() => {
        setRestTime(time => {
          if (time <= 1) {
            setIsResting(false);
            toast({
              title: "Rest Complete!",
              description: "Time for your next set 💪",
            });
            return 0;
          }
          return time - 1;
        });
      }, 1000);
    }
    
    return () => clearInterval(interval);
  }, [isResting, restTime, toast]);

  // Workout timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (workoutStartTime) {
      interval = setInterval(() => {
        setWorkoutDuration(Math.floor((Date.now() - workoutStartTime.getTime()) / 1000));
      }, 1000);
    }
    
    return () => clearInterval(interval);
  }, [workoutStartTime]);

  const toggleVoiceRecognition = () => {
    if (!recognition) {
      toast({
        title: "Voice Recognition Not Available",
        description: "Your browser doesn't support speech recognition.",
        variant: "destructive"
      });
      return;
    }

    if (isListening) {
      recognition.stop();
      setIsListening(false);
    } else {
      recognition.start();
      setIsListening(true);
      toast({
        title: "Voice Recognition Active",
        description: "Say 'rep' or 'one' to count reps, 'set' for next set",
      });
    }
  };

  const incrementReps = () => {
    setCurrentReps(prev => prev + 1);
    toast({
      title: "Rep Counted!",
      description: `Total reps: ${currentReps + 1}`,
    });
  };

  const completeSet = () => {
    if (currentReps > 0) {
      setCurrentSets(prev => prev + 1);
      
      // Start rest timer
      if (currentExercise.restTime > 0) {
        setRestTime(currentExercise.restTime);
        setIsResting(true);
      }
      
      toast({
        title: "Set Complete!",
        description: `Set ${currentSets + 1} completed with ${currentReps} reps`,
      });
      
      setCurrentReps(0);
    }
  };

  const resetCurrentExercise = () => {
    setCurrentReps(0);
    setCurrentSets(0);
    setIsResting(false);
    setRestTime(0);
  };

  const addExercise = () => {
    if (!currentExercise.name) {
      toast({
        title: "Exercise Name Required",
        description: "Please enter an exercise name",
        variant: "destructive"
      });
      return;
    }

    const exercise: Exercise = {
      ...currentExercise,
      sets: currentSets,
      reps: currentReps * currentSets || currentExercise.reps
    };

    setSession(prev => ({
      ...prev,
      exercises: [...prev.exercises, exercise]
    }));

    resetCurrentExercise();
    setCurrentExercise({
      name: '',
      sets: 0,
      reps: 0,
      weight: 0,
      restTime: 60
    });

    toast({
      title: "Exercise Added!",
      description: `${exercise.name} added to your workout`,
    });
  };

  const startWorkout = () => {
    setWorkoutStartTime(new Date());
    toast({
      title: "Workout Started!",
      description: "Time to get those gains! 💪",
    });
  };

  const saveWorkout = async () => {
    if (!user) return;
    
    if (!session.title || session.exercises.length === 0) {
      toast({
        title: "Incomplete Workout",
        description: "Please add a title and at least one exercise",
        variant: "destructive"
      });
      return;
    }

    try {
      // Save workout session
      const totalReps = session.exercises.reduce((sum, ex) => sum + ex.reps, 0);
      const totalSets = session.exercises.reduce((sum, ex) => sum + ex.sets, 0);
      
      const { data: workoutData, error: workoutError } = await supabase
        .from('workout_sessions')
        .insert({
          user_id: user.id,
          title: session.title,
          duration_minutes: Math.round(workoutDuration / 60),
          total_reps: totalReps,
          total_sets: totalSets,
          notes: session.notes
        })
        .select()
        .single();

      if (workoutError) throw workoutError;

      // Save exercises
      const exerciseData = session.exercises.map(exercise => ({
        session_id: workoutData.id,
        exercise_name: exercise.name,
        sets: exercise.sets,
        reps: exercise.reps,
        rest_time_seconds: exercise.restTime,
        weight_kg: exercise.weight
      }));

      const { error: exerciseError } = await supabase
        .from('exercises')
        .insert(exerciseData);

      if (exerciseError) throw exerciseError;

      toast({
        title: "Workout Saved!",
        description: "Great job completing your workout! 🎉",
      });

      // Reset for new workout
      setSession({ title: '', exercises: [], notes: '' });
      setWorkoutStartTime(null);
      setWorkoutDuration(0);
      resetCurrentExercise();

    } catch (error) {
      console.error('Error saving workout:', error);
      toast({
        title: "Save Failed",
        description: "There was an error saving your workout",
        variant: "destructive"
      });
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-foreground">Workout Session</h1>
        {workoutStartTime && (
          <Badge variant="secondary" className="text-lg px-3 py-1">
            <TimerIcon className="h-4 w-4 mr-2" />
            {formatTime(workoutDuration)}
          </Badge>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Current Exercise */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Dumbbell className="h-5 w-5" />
              Current Exercise
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="exercise-name">Exercise Name</Label>
              <Input
                id="exercise-name"
                value={currentExercise.name}
                onChange={(e) => setCurrentExercise(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Push-ups, Squats, Bench Press"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="weight">Weight (kg)</Label>
                <Input
                  id="weight"
                  type="number"
                  value={currentExercise.weight}
                  onChange={(e) => setCurrentExercise(prev => ({ ...prev, weight: Number(e.target.value) }))}
                  placeholder="0"
                />
              </div>
              <div>
                <Label htmlFor="rest-time">Rest Time (seconds)</Label>
                <Input
                  id="rest-time"
                  type="number"
                  value={currentExercise.restTime}
                  onChange={(e) => setCurrentExercise(prev => ({ ...prev, restTime: Number(e.target.value) }))}
                  placeholder="60"
                />
              </div>
            </div>

            {/* Rep Counter */}
            <div className="bg-muted p-4 rounded-lg">
              <div className="text-center space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">Current Set</p>
                  <p className="text-3xl font-bold">{currentSets + 1}</p>
                </div>
                
                <div>
                  <p className="text-sm text-muted-foreground">Reps</p>
                  <p className="text-4xl font-bold text-accent">{currentReps}</p>
                </div>

                <div className="flex justify-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentReps(Math.max(0, currentReps - 1))}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={incrementReps}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Voice Recognition */}
            <div className="space-y-2">
              <Button
                variant={isListening ? "destructive" : "secondary"}
                onClick={toggleVoiceRecognition}
                className={`w-full ${isListening ? 'recording-pulse' : ''}`}
              >
                {isListening ? (
                  <>
                    <MicOff className="h-4 w-4 mr-2" />
                    Stop Voice Recognition
                  </>
                ) : (
                  <>
                    <Mic className="h-4 w-4 mr-2" />
                    Start Voice Recognition
                  </>
                )}
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                Say "rep" or "one" to count, "set" to complete set, "reset" to start over
              </p>
            </div>

            {/* Rest Timer */}
            {isResting && (
              <div className="bg-secondary text-secondary-foreground p-4 rounded-lg text-center">
                <p className="text-sm font-medium">Rest Time</p>
                <p className="text-2xl font-bold">{formatTime(restTime)}</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsResting(false)}
                  className="mt-2"
                >
                  Skip Rest
                </Button>
              </div>
            )}

            {/* Exercise Controls */}
            <div className="flex gap-2">
              <Button onClick={completeSet} className="flex-1">
                Complete Set
              </Button>
              <Button variant="outline" onClick={resetCurrentExercise}>
                <RotateCcw className="h-4 w-4" />
              </Button>
            </div>

            <Button onClick={addExercise} variant="secondary" className="w-full">
              Add Exercise to Workout
            </Button>
          </CardContent>
        </Card>

        {/* Workout Session */}
        <Card>
          <CardHeader>
            <CardTitle>Workout Session</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="workout-title">Workout Title</Label>
              <Input
                id="workout-title"
                value={session.title}
                onChange={(e) => setSession(prev => ({ ...prev, title: e.target.value }))}
                placeholder="e.g., Upper Body Strength"
              />
            </div>

            {!workoutStartTime ? (
              <Button onClick={startWorkout} className="w-full">
                <Play className="h-4 w-4 mr-2" />
                Start Workout
              </Button>
            ) : (
              <div className="text-center text-sm text-muted-foreground">
                Workout in progress for {formatTime(workoutDuration)}
              </div>
            )}

            {/* Exercise List */}
            <div className="space-y-3">
              <h4 className="font-medium">Exercises ({session.exercises.length})</h4>
              {session.exercises.map((exercise, index) => (
                <div key={index} className="bg-muted p-3 rounded-lg">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium">{exercise.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {exercise.sets} sets × {exercise.reps} reps
                        {exercise.weight > 0 && ` @ ${exercise.weight}kg`}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {exercise.restTime}s rest
                    </Badge>
                  </div>
                </div>
              ))}
              
              {session.exercises.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Dumbbell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No exercises added yet</p>
                </div>
              )}
            </div>

            <div>
              <Label htmlFor="workout-notes">Notes</Label>
              <Textarea
                id="workout-notes"
                value={session.notes}
                onChange={(e) => setSession(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="How did the workout feel? Any observations..."
                rows={3}
              />
            </div>

            <Button onClick={saveWorkout} className="w-full" disabled={session.exercises.length === 0}>
              <Save className="h-4 w-4 mr-2" />
              Save Workout
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Workout;