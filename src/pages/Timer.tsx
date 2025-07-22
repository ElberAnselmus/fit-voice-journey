import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Play, Pause, RotateCcw, Timer as TimerIcon, Settings } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

const Timer = () => {
  const [workoutTime, setWorkoutTime] = useState(0); // seconds
  const [restTime, setRestTime] = useState(0); // seconds
  const [isWorkoutActive, setIsWorkoutActive] = useState(false);
  const [isRestActive, setIsRestActive] = useState(false);
  const [workoutDuration, setWorkoutDuration] = useState(30); // default 30 seconds
  const [restDuration, setRestDuration] = useState(15); // default 15 seconds
  const [sets, setSets] = useState(0);
  const [currentSet, setCurrentSet] = useState(1);
  const [totalSets, setTotalSets] = useState(3);

  // Format time as MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Timer effect for workout
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isWorkoutActive && workoutTime > 0) {
      interval = setInterval(() => {
        setWorkoutTime(time => {
          if (time <= 1) {
            setIsWorkoutActive(false);
            // Auto-start rest timer if we have more sets
            if (currentSet < totalSets) {
              setRestTime(restDuration);
              setIsRestActive(true);
            } else {
              // Workout complete
              setCurrentSet(1);
            }
            return 0;
          }
          return time - 1;
        });
      }, 1000);
    }

    return () => clearInterval(interval);
  }, [isWorkoutActive, workoutTime, currentSet, totalSets, restDuration]);

  // Timer effect for rest
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isRestActive && restTime > 0) {
      interval = setInterval(() => {
        setRestTime(time => {
          if (time <= 1) {
            setIsRestActive(false);
            // Start next set
            setCurrentSet(prev => prev + 1);
            setWorkoutTime(workoutDuration);
            setIsWorkoutActive(true);
            return 0;
          }
          return time - 1;
        });
      }, 1000);
    }

    return () => clearInterval(interval);
  }, [isRestActive, restTime, workoutDuration]);

  const startWorkout = () => {
    if (!isWorkoutActive && !isRestActive) {
      setWorkoutTime(workoutDuration);
      setCurrentSet(1);
    }
    setIsWorkoutActive(true);
  };

  const pauseTimer = () => {
    setIsWorkoutActive(false);
    setIsRestActive(false);
  };

  const resetTimer = () => {
    setIsWorkoutActive(false);
    setIsRestActive(false);
    setWorkoutTime(0);
    setRestTime(0);
    setCurrentSet(1);
    setSets(0);
  };

  const getTimerStatus = () => {
    if (isWorkoutActive) return 'WORK OUT';
    if (isRestActive) return 'REST';
    if (workoutTime === 0 && restTime === 0 && currentSet === 1) return 'READY';
    if (currentSet > totalSets) return 'COMPLETE';
    return 'PAUSED';
  };

  const getStatusColor = () => {
    const status = getTimerStatus();
    switch (status) {
      case 'WORK OUT': return 'bg-accent text-accent-foreground';
      case 'REST': return 'bg-secondary text-secondary-foreground';
      case 'COMPLETE': return 'bg-green-500 text-white';
      case 'PAUSED': return 'bg-yellow-500 text-white';
      default: return 'bg-primary text-primary-foreground';
    }
  };

  const getCurrentTime = () => {
    if (isWorkoutActive) return workoutTime;
    if (isRestActive) return restTime;
    return 0;
  };

  const getCurrentDuration = () => {
    if (isWorkoutActive) return workoutDuration;
    if (isRestActive) return restDuration;
    return workoutDuration;
  };

  const getProgress = () => {
    const current = getCurrentTime();
    const total = getCurrentDuration();
    return total > 0 ? ((total - current) / total) * 100 : 0;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-foreground">Timer</h1>
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Timer Settings</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="workout-duration">Workout Duration (seconds)</Label>
                <Input
                  id="workout-duration"
                  type="number"
                  value={workoutDuration}
                  onChange={(e) => setWorkoutDuration(Number(e.target.value))}
                  min="1"
                  max="3600"
                />
              </div>
              <div>
                <Label htmlFor="rest-duration">Rest Duration (seconds)</Label>
                <Input
                  id="rest-duration"
                  type="number"
                  value={restDuration}
                  onChange={(e) => setRestDuration(Number(e.target.value))}
                  min="1"
                  max="3600"
                />
              </div>
              <div>
                <Label htmlFor="total-sets">Total Sets</Label>
                <Input
                  id="total-sets"
                  type="number"
                  value={totalSets}
                  onChange={(e) => setTotalSets(Number(e.target.value))}
                  min="1"
                  max="50"
                />
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="max-w-md mx-auto">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2">
              <TimerIcon className="h-6 w-6" />
              Workout Timer
            </CardTitle>
            <Badge className={getStatusColor()}>
              {getTimerStatus()}
            </Badge>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Main Timer Display */}
            <div className="text-center">
              <div className={`text-6xl font-bold mb-4 ${isWorkoutActive || isRestActive ? 'timer-pulse' : ''}`}>
                {formatTime(getCurrentTime())}
              </div>
              
              {/* Progress Circle */}
              <div className="relative w-32 h-32 mx-auto mb-4">
                <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 120 120">
                  <circle
                    cx="60"
                    cy="60"
                    r="54"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="transparent"
                    className="text-muted"
                  />
                  <circle
                    cx="60"
                    cy="60"
                    r="54"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="transparent"
                    strokeDasharray={`${2 * Math.PI * 54}`}
                    strokeDashoffset={`${2 * Math.PI * 54 * (1 - getProgress() / 100)}`}
                    className={isWorkoutActive ? "text-accent" : "text-secondary"}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-sm font-medium">
                    {Math.round(getProgress())}%
                  </span>
                </div>
              </div>
            </div>

            {/* Set Information */}
            <div className="text-center space-y-2">
              <p className="text-lg font-medium">
                Set {currentSet} of {totalSets}
              </p>
              <div className="flex justify-center gap-4 text-sm text-muted-foreground">
                <span>Work: {formatTime(workoutDuration)}</span>
                <span>Rest: {formatTime(restDuration)}</span>
              </div>
            </div>

            {/* Controls */}
            <div className="flex justify-center gap-4">
              {!isWorkoutActive && !isRestActive ? (
                <Button onClick={startWorkout} size="lg" className="flex-1">
                  <Play className="h-5 w-5 mr-2" />
                  Start
                </Button>
              ) : (
                <Button onClick={pauseTimer} variant="secondary" size="lg" className="flex-1">
                  <Pause className="h-5 w-5 mr-2" />
                  Pause
                </Button>
              )}
              
              <Button onClick={resetTimer} variant="outline" size="lg">
                <RotateCcw className="h-5 w-5" />
              </Button>
            </div>

            {/* Instructions */}
            <div className="text-center text-sm text-muted-foreground">
              {getTimerStatus() === 'READY' && (
                <p>Press Start to begin your workout timer</p>
              )}
              {getTimerStatus() === 'WORK OUT' && (
                <p>Time to work out! Give it your all! 💪</p>
              )}
              {getTimerStatus() === 'REST' && (
                <p>Rest time. Prepare for the next set 😌</p>
              )}
              {getTimerStatus() === 'COMPLETE' && (
                <p>Workout complete! Great job! 🎉</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Timer;