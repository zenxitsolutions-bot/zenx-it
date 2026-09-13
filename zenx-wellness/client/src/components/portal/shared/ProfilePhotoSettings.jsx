import { useEffect, useRef, useState } from 'react';
import { Camera, Upload, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { useProfilePhoto, useSaveProfilePhoto } from '@/hooks/useProfilePhoto';
import { AccountAvatar } from './AccountAvatar';

export function ProfilePhotoSettings() {
  const input = useRef(null);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState('');
  const { data: savedPhoto, isError } = useProfilePhoto();
  const savePhoto = useSaveProfilePhoto();
  useEffect(() => {
    if (!file) { setPreview(null); return undefined; }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  function choosePhoto(event) {
    const selected = event.target.files?.[0];
    event.target.value = '';
    setFile(null);
    setError('');
    if (!selected) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(selected.type)) {
      setError('Choose a JPG, PNG, or WebP photo.'); return;
    }
    if (selected.size > 2 * 1024 * 1024) {
      setError('Choose a photo smaller than 2 MB.'); return;
    }
    setFile(selected);
  }

  function save(selected) {
    setError('');
    savePhoto.mutate(selected, {
      onSuccess: () => { setFile(null); toast.success(selected ? 'Profile photo updated.' : 'Profile photo removed.'); },
      onError: (err) => setError(err.response?.data?.error || 'Could not update your photo. Please try again.'),
    });
  }

  return (
    <section className="rounded-xl border border-line bg-cream/60 p-4" aria-label="Profile photo">
      <div className="flex items-center gap-4">
        {preview ? <img src={preview} alt="New profile photo preview" className="size-16 shrink-0 rounded-full object-cover ring-2 ring-sage" /> : <AccountAvatar className="size-16 text-xl" />}
        <div className="min-w-0">
          <h3 className="text-sm font-medium text-forest">Profile photo</h3>
          <p id="photo-help" className="mt-1 text-xs text-muted-foreground">JPG, PNG or WebP · Up to 2 MB</p>
          <Button type="button" variant="outline" size="sm" className="mt-2" disabled={savePhoto.isPending} onClick={() => input.current?.click()}>
            <Camera className="size-4" />{savedPhoto ? 'Change photo' : 'Choose photo'}
          </Button>
          <input ref={input} type="file" className="sr-only" tabIndex={-1} accept="image/jpeg,image/png,image/webp" aria-label="Choose profile photo" aria-describedby="photo-help" disabled={savePhoto.isPending} onChange={choosePhoto} />
        </div>
      </div>
      {file && <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button type="button" size="sm" disabled={savePhoto.isPending} onClick={() => save(file)}><Upload className="size-4" />{savePhoto.isPending ? 'Uploading…' : 'Upload photo'}</Button>
        <Button type="button" size="sm" variant="ghost" disabled={savePhoto.isPending} onClick={() => setFile(null)}>Cancel</Button>
      </div>}
      {savedPhoto && !file && <button type="button" disabled={savePhoto.isPending} onClick={() => save(null)} className="mt-3 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-forest disabled:opacity-50"><X className="size-3" />{savePhoto.isPending ? 'Removing…' : 'Remove photo'}</button>}
      <p className="mt-2 text-xs text-muted-foreground">Photo changes save immediately.</p>
      {(error || isError) && <p role="alert" className="mt-2 text-xs text-destructive">{error || 'Your saved photo could not be loaded. Please try again.'}</p>}
    </section>
  );
}
