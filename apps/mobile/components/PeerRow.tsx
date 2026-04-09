import React from 'react';
import { View, Text } from 'react-native';
import type { Peer } from '../store/usePeersStore';

export default function PeerRow({ peer }: { peer: Peer }) {
  const bars = [1, 2, 3];
  
  return (
    <View className="flex-row items-center justify-between py-4 border-b border-[rgba(255,255,255,0.08)]">
      <View className="flex-row items-center">
        <Text style={{ fontFamily: 'Inter_500Medium' }} className="text-white text-base mr-3">
          {peer.name}
        </Text>
        <View className="flex-row items-end space-x-[2px] mb-[2px]">
          {bars.map((bar) => (
            <View 
              key={bar} 
              style={{
                width: 3, 
                height: bar === 1 ? 8 : bar === 2 ? 12 : 16,
                backgroundColor: bar <= peer.signalStrength ? '#ffffff' : '#444444',
                marginLeft: 2
              }} 
            />
          ))}
        </View>
      </View>
      <Text style={{ fontFamily: 'Inter_400Regular' }} className="text-[#888888] text-sm">
        {peer.distanceMeters}m
      </Text>
    </View>
  );
}
