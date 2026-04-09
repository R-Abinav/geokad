import React, { useEffect } from 'react';
import { View, Text, FlatList, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePeersStore } from '../../store/usePeersStore';
import PeerRow from '../../components/PeerRow';

export default function PeersScreen() {
  const insets = useSafeAreaInsets();
  const { peers, apiStatus, refreshPeers } = usePeersStore();

  useEffect(() => {
    refreshPeers();
  }, [refreshPeers]);

  return (
    <View style={{ flex: 1, backgroundColor: '#000000', paddingTop: insets.top, paddingHorizontal: 24 }}>
      <View className="mt-8 mb-6">
        <Text style={{ fontFamily: 'Inter_700Bold' }} className="text-white text-3xl mb-1">
          Nearby
        </Text>
        <Text style={{ fontFamily: 'Inter_400Regular' }} className="text-[#888888] text-sm mt-1">
          {peers.length} peers in mesh range
        </Text>
        {apiStatus === 'API Not responding' && (
          <Text style={{ fontFamily: 'Inter_500Medium' }} className="text-red-500 text-xs mt-2">
            API Not responding currently
          </Text>
        )}
      </View>

      {peers.length > 0 ? (
        <FlatList
          data={peers}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <PeerRow peer={item} />}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 20 }}
          refreshControl={
            <RefreshControl refreshing={false} onRefresh={refreshPeers} tintColor="#ffffff" />
          }
        />
      ) : (
        <View className="flex-1 justify-center items-center pb-20">
          <Text style={{ fontFamily: 'Inter_500Medium' }} className="text-[#888888] text-base mb-2">
            No peers detected
          </Text>
          <Text style={{ fontFamily: 'Inter_400Regular' }} className="text-[#666666] text-sm text-center">
            {apiStatus === 'API Not responding' ? 'System backend is unreachable' : 'Make sure others have TourSafe open'}
          </Text>
        </View>
      )}
    </View>
  );
}
