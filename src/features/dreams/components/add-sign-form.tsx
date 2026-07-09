import { useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { DictationButton } from '@/components/dictation-button';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { TextField } from '@/components/ui/text-field';
import { Spacing } from '@/constants/theme';
import { useDictation } from '@/features/dictation/use-dictation';
import { addSign, type AddedSign } from '@/features/dreams/signs';

export interface AddSignFormProps {
  dreamId: string;
  onSaved: (result: AddedSign) => void;
  onCancel: () => void;
}

/** Log a Sign: text or dictation, optional photo. Shared by the plant detail
 * sheet and the post-session nudge screen. */
export function AddSignForm({ dreamId, onSaved, onCancel }: AddSignFormProps) {
  const queryClient = useQueryClient();
  const [signText, setSignText] = useState('');
  const [photoUri, setPhotoUri] = useState<string | undefined>();

  const dictation = useDictation((finalText) => {
    setSignText((current) => (current ? `${current} ${finalText}` : finalText));
  });

  const addSignMutation = useMutation({
    mutationFn: () => addSign({ dreamId, text: signText.trim(), photoUri }),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['signs', dreamId] });
      queryClient.invalidateQueries({ queryKey: ['sign-counts'] });
      queryClient.invalidateQueries({ queryKey: ['dreams'] });
      queryClient.invalidateQueries({ queryKey: ['sessions', dreamId] });
      onSaved(result);
    },
  });

  const pickPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri);
    }
  };

  return (
    <View style={styles.container}>
      <TextField
        label="What did you notice?"
        value={dictation.isListening && dictation.transcript ? dictation.transcript : signText}
        onChangeText={setSignText}
        multiline
        placeholder="A synchronicity, a small win, a nudge from the world…"
        editable={!dictation.isListening}
        errorText={dictation.error ?? undefined}
      />
      <View style={styles.actions}>
        <DictationButton
          isListening={dictation.isListening}
          onPress={() => (dictation.isListening ? dictation.stop() : dictation.start())}
        />
        <Button
          label={photoUri ? 'Change photo' : 'Add photo'}
          variant="secondary"
          onPress={pickPhoto}
        />
      </View>
      {photoUri ? <Image source={{ uri: photoUri }} style={styles.photoPreview} /> : null}
      {addSignMutation.error ? (
        <ThemedText themeColor="danger">Couldn’t save your sign. Please try again.</ThemedText>
      ) : null}
      <Button
        label="Save this sign"
        loading={addSignMutation.isPending}
        disabled={signText.trim().length < 2 || dictation.isListening}
        onPress={() => addSignMutation.mutate()}
      />
      <Button label="Cancel" variant="ghost" onPress={onCancel} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.three,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  photoPreview: {
    width: '100%',
    height: 160,
    borderRadius: Spacing.three,
  },
});
