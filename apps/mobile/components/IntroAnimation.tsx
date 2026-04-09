import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View, Easing, Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

interface IntroAnimationProps {
  onComplete: () => void;
  sosCenterY: number | null;
}

export default function IntroAnimation({ onComplete, sosCenterY }: IntroAnimationProps) {
  const dotScale = useRef(new Animated.Value(0)).current; 
  const ring1Scale = useRef(new Animated.Value(0.111)).current;
  const ring1Op = useRef(new Animated.Value(0)).current;
  const ring2Scale = useRef(new Animated.Value(0.111)).current;
  const ring2Op = useRef(new Animated.Value(0)).current;
  const ring3Scale = useRef(new Animated.Value(0.111)).current;
  const ring3Op = useRef(new Animated.Value(0)).current;
  
  const textOp = useRef(new Animated.Value(0)).current;
  const overlayOp = useRef(new Animated.Value(1)).current;

  // Defaults to a reasonable 45% bound visually until exact ref finishes computing
  const targetY = sosCenterY !== null ? sosCenterY : (height * 0.45);

  useEffect(() => {
    Animated.sequence([
      Animated.spring(dotScale, { toValue: 0.125, tension: 120, friction: 6, useNativeDriver: true }),
      Animated.delay(400),
      
      Animated.parallel([
        Animated.timing(ring1Scale, { toValue: 2.5, duration: 1500, easing: Easing.out(Easing.ease), useNativeDriver: true }),
        Animated.sequence([
          Animated.timing(ring1Op, { toValue: 0.6, duration: 200, useNativeDriver: true }),
          Animated.timing(ring1Op, { toValue: 0, duration: 1300, useNativeDriver: true })
        ])
      ]),
      
      Animated.delay(200),
      
      Animated.parallel([
        Animated.timing(ring2Scale, { toValue: 2.5, duration: 1500, easing: Easing.out(Easing.ease), useNativeDriver: true }),
        Animated.sequence([
          Animated.timing(ring2Op, { toValue: 0.6, duration: 200, useNativeDriver: true }),
          Animated.timing(ring2Op, { toValue: 0, duration: 1300, useNativeDriver: true })
        ])
      ]),

      Animated.delay(200),

      Animated.parallel([
        Animated.spring(ring3Scale, { toValue: 1, tension: 50, friction: 8, useNativeDriver: true }),
        Animated.timing(ring3Op, { toValue: 0.3, duration: 400, useNativeDriver: true }),
        Animated.spring(dotScale, { toValue: 1, tension: 50, friction: 8, useNativeDriver: true }),
      ]),
      
      Animated.delay(200),

      Animated.timing(textOp, { toValue: 1, duration: 400, useNativeDriver: true }),
      
      Animated.delay(1000),

      Animated.timing(overlayOp, { toValue: 0, duration: 800, easing: Easing.inOut(Easing.ease), useNativeDriver: true })
    ]).start(() => {
      onComplete();
    });
  }, []);

  return (
    <Animated.View style={[styles.container, { opacity: overlayOp }]} pointerEvents="none">
      {/* Cluster relies explicitly on dynamic absolute pageY constraints to exactly mask the real SOS component natively! */}
      <View style={[styles.cluster, { top: targetY - 90, left: (width / 2) - 90 }]}>
        
        <Animated.View style={[styles.ring, { transform: [{ scale: ring1Scale }], opacity: ring1Op }]} />
        <Animated.View style={[styles.ring, { transform: [{ scale: ring2Scale }], opacity: ring2Op }]} />
        <Animated.View style={[styles.ring, { transform: [{ scale: ring3Scale }], opacity: ring3Op }]} />
        
        <Animated.View style={[styles.dot, { transform: [{ scale: dotScale }] }]} />
        
        <Animated.Text style={[styles.sosText, { opacity: textOp }]}>SOS</Animated.Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000000',
    zIndex: 999,
    elevation: 999,
  },
  cluster: {
    position: 'absolute',
    width: 180,
    height: 180,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dot: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: '#FF3B30',
    position: 'absolute',
  },
  ring: {
    width: 180,
    height: 180,
    borderRadius: 90,
    borderWidth: 1,
    borderColor: '#FF3B30',
    position: 'absolute',
  },
  sosText: {
    position: 'absolute',
    fontFamily: 'Inter_800ExtraBold',
    fontSize: 28,
    color: '#ffffff',
  }
});
