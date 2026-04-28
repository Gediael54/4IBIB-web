import type { ChurchProfile, SiteSnapshot } from "@4ibib/core";
import { zodResolver } from "@hookform/resolvers/zod";
import { Save } from "lucide-react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { Field, TextAreaField } from "../components/ui";
import { useUpdateProfile } from "../hooks";
import { profileSchema, type ProfileFormValues } from "../schemas";
import { TEXT_MAX, TEXTAREA_MAX, URL_MAX } from "../utils";

interface ProfileViewProps {
  snapshot: SiteSnapshot;
}

function profileToFormValues(profile: ChurchProfile): ProfileFormValues {
  return {
    name: profile.name,
    shortName: profile.shortName,
    tagline: profile.tagline,
    city: profile.city,
    pastorName: profile.pastorName,
    address: profile.address,
    email: profile.email,
    whatsapp: profile.whatsapp,
    instagramUrl: profile.instagramUrl,
    youtubeUrl: profile.youtubeUrl,
    mapsUrl: profile.mapsUrl,
    heroVerse: profile.heroVerse,
    mission: profile.mission,
    foundedText: profile.foundedText
  };
}

export default function ProfileView({ snapshot }: ProfileViewProps) {
  const updateMutation = useUpdateProfile();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting }
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: profileToFormValues(snapshot.profile)
  });

  useEffect(() => {
    reset(profileToFormValues(snapshot.profile));
  }, [snapshot.profile, reset]);

  async function onSubmit(values: ProfileFormValues) {
    await updateMutation.mutateAsync({
      ...snapshot.profile,
      ...values
    });
  }

  const saving = isSubmitting || updateMutation.isPending;

  return (
    <section>
      <header className="workspace-heading">
        <div>
          <p className="eyebrow">Configuracao</p>
          <h1>Dados da igreja</h1>
        </div>
      </header>
      <form className="profile-form" onSubmit={handleSubmit(onSubmit)} noValidate>
        <div className="form-grid">
          <Field
            label="Nome"
            placeholder="Nome"
            maxLength={TEXT_MAX}
            error={errors.name?.message}
            {...register("name")}
          />
          <Field
            label="Nome curto"
            placeholder="Nome curto"
            maxLength={TEXT_MAX}
            error={errors.shortName?.message}
            {...register("shortName")}
          />
        </div>
        <Field
          label="Chamada"
          placeholder="Chamada"
          maxLength={TEXT_MAX}
          error={errors.tagline?.message}
          {...register("tagline")}
        />
        <TextAreaField
          label="Missao"
          placeholder="Missao"
          maxLength={TEXTAREA_MAX}
          error={errors.mission?.message}
          {...register("mission")}
        />
        <div className="form-grid">
          <Field
            label="Cidade"
            placeholder="Cidade"
            maxLength={TEXT_MAX}
            error={errors.city?.message}
            {...register("city")}
          />
          <Field
            label="Pastor"
            placeholder="Pastor"
            maxLength={TEXT_MAX}
            error={errors.pastorName?.message}
            {...register("pastorName")}
          />
        </div>
        <Field
          label="Endereco"
          placeholder="Endereco"
          maxLength={TEXT_MAX}
          error={errors.address?.message}
          {...register("address")}
        />
        <div className="form-grid">
          <Field
            label="Email"
            type="email"
            placeholder="Email"
            maxLength={TEXT_MAX}
            error={errors.email?.message}
            {...register("email")}
          />
          <Field
            label="WhatsApp"
            placeholder="WhatsApp"
            maxLength={TEXT_MAX}
            error={errors.whatsapp?.message}
            {...register("whatsapp")}
          />
        </div>
        <div className="form-grid">
          <Field
            label="Instagram"
            type="url"
            placeholder="Instagram"
            maxLength={URL_MAX}
            error={errors.instagramUrl?.message}
            {...register("instagramUrl")}
          />
          <Field
            label="YouTube"
            type="url"
            placeholder="YouTube"
            maxLength={URL_MAX}
            error={errors.youtubeUrl?.message}
            {...register("youtubeUrl")}
          />
        </div>
        <Field
          label="Google Maps"
          type="url"
          placeholder="Google Maps"
          maxLength={URL_MAX}
          error={errors.mapsUrl?.message}
          {...register("mapsUrl")}
        />
        <Field
          label="Versiculo"
          placeholder="Versiculo"
          maxLength={TEXTAREA_MAX}
          error={errors.heroVerse?.message}
          {...register("heroVerse")}
        />
        <Field
          label="Texto historico"
          placeholder="Texto historico"
          maxLength={TEXTAREA_MAX}
          error={errors.foundedText?.message}
          {...register("foundedText")}
        />
        {updateMutation.error && (
          <p className="form-error">
            {updateMutation.error instanceof Error ? updateMutation.error.message : "Falha ao salvar."}
          </p>
        )}
        <button className="button primary" disabled={saving} type="submit">
          <Save size={18} /> Salvar igreja
        </button>
      </form>
    </section>
  );
}
