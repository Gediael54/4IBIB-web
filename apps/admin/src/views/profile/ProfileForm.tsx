import { type ChurchProfile } from "@4ibib/core";
import { valibotResolver } from "@hookform/resolvers/valibot";
import { useImperativeHandle, type ReactNode, type Ref } from "react";
import { useForm } from "react-hook-form";
import { Field, TextAreaField } from "../../components/ui";
import { TEXT_MAX, TEXTAREA_MAX, URL_MAX } from "../../lib/limits";
import { profileSchema, type ProfileFormValues } from "../../schemas";

export interface ProfileFormHandle {
  reset: () => void;
}

interface ProfileFormProps {
  formId: string;
  profile: ChurchProfile | null;
  onSubmit: (values: ProfileFormValues) => Promise<void> | void;
  handleRef?: Ref<ProfileFormHandle>;
}

function emptyProfileValues(): ProfileFormValues {
  return {
    name: "",
    shortName: "",
    tagline: "",
    city: "",
    pastorName: "",
    address: "",
    email: "",
    whatsapp: "",
    instagramUrl: "",
    youtubeUrl: "",
    mapsUrl: "",
    heroVerse: "",
    mission: ""
  };
}

function profileToFormValues(profile: ChurchProfile | null): ProfileFormValues {
  if (!profile) {
    return emptyProfileValues();
  }
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
    mission: profile.mission
  };
}

interface ProfileSectionProps {
  eyebrow: string;
  title: string;
  description?: string;
  children: ReactNode;
}

function ProfileSection({ eyebrow, title, description, children }: ProfileSectionProps) {
  return (
    <section className="profile-section">
      <header className="profile-section-header">
        <p className="profile-section-eyebrow">{eyebrow}</p>
        <h2 className="profile-section-title">{title}</h2>
        {description && <p className="profile-section-description">{description}</p>}
      </header>
      <div className="profile-section-body">{children}</div>
    </section>
  );
}

export default function ProfileForm({ formId, profile, onSubmit, handleRef }: ProfileFormProps) {
  const form = useForm<ProfileFormValues>({
    resolver: valibotResolver(profileSchema),
    defaultValues: profileToFormValues(profile)
  });

  useImperativeHandle(
    handleRef,
    () => ({
      reset: () => form.reset(profileToFormValues(profile))
    }),
    [form, profile]
  );

  const formKey = profile?.id ?? "new-profile";

  return (
    <form
      id={formId}
      key={formKey}
      className="profile-form-stack"
      onSubmit={form.handleSubmit(onSubmit)}
      noValidate
    >
      <ProfileSection
        eyebrow="Identidade"
        title="Nome e identificação"
        description="Como a igreja é chamada no site, em buscas e em mensagens automáticas."
      >
        <div className="profile-grid-2">
          <Field
            label="Nome"
            placeholder="Nome completo"
            maxLength={TEXT_MAX}
            error={form.formState.errors.name?.message}
            {...form.register("name")}
          />
          <Field
            label="Sigla"
            placeholder="Sigla curta"
            maxLength={TEXT_MAX}
            error={form.formState.errors.shortName?.message}
            {...form.register("shortName")}
          />
        </div>
        <div className="profile-grid-2">
          <Field
            label="Cidade"
            placeholder="Cidade, UF"
            maxLength={TEXT_MAX}
            error={form.formState.errors.city?.message}
            {...form.register("city")}
          />
          <Field
            label="Pastor"
            placeholder="Nome do pastor"
            maxLength={TEXT_MAX}
            error={form.formState.errors.pastorName?.message}
            {...form.register("pastorName")}
          />
        </div>
      </ProfileSection>

      <ProfileSection
        eyebrow="Localização"
        title="Onde a igreja se encontra"
        description="Endereço completo e link do Google Maps que abre no botão Como chegar."
      >
        <Field
          label="Endereco"
          placeholder="Rua, numero, bairro"
          maxLength={TEXT_MAX}
          error={form.formState.errors.address?.message}
          {...form.register("address")}
        />
        <Field
          label="Google Maps"
          type="url"
          placeholder="https://maps.google.com/..."
          maxLength={URL_MAX}
          error={form.formState.errors.mapsUrl?.message}
          {...form.register("mapsUrl")}
        />
      </ProfileSection>

      <ProfileSection
        eyebrow="Contato"
        title="Canais de comunicação"
        description="Email institucional, WhatsApp e perfis sociais exibidos no rodapé do site."
      >
        <div className="profile-grid-2">
          <Field
            label="Email"
            type="email"
            placeholder="contato@exemplo.com"
            maxLength={TEXT_MAX}
            error={form.formState.errors.email?.message}
            {...form.register("email")}
          />
          <Field
            label="WhatsApp"
            placeholder="+55 81 90000-0000"
            maxLength={TEXT_MAX}
            error={form.formState.errors.whatsapp?.message}
            {...form.register("whatsapp")}
          />
        </div>
        <div className="profile-grid-2">
          <Field
            label="Instagram"
            type="url"
            placeholder="https://instagram.com/..."
            maxLength={URL_MAX}
            error={form.formState.errors.instagramUrl?.message}
            {...form.register("instagramUrl")}
          />
          <Field
            label="YouTube"
            type="url"
            placeholder="https://youtube.com/..."
            maxLength={URL_MAX}
            error={form.formState.errors.youtubeUrl?.message}
            {...form.register("youtubeUrl")}
          />
        </div>
      </ProfileSection>

      <ProfileSection
        eyebrow="Mensagem"
        title="Voz da igreja"
        description="Tagline curta para o cabeçalho, missão e versículo destaque do banner inicial."
      >
        <TextAreaField
          label="Tagline"
          placeholder="Subtitulo curto"
          maxLength={TEXTAREA_MAX}
          error={form.formState.errors.tagline?.message}
          {...form.register("tagline")}
        />
        <TextAreaField
          label="Missao"
          placeholder="Declaracao de missao"
          maxLength={TEXTAREA_MAX}
          error={form.formState.errors.mission?.message}
          {...form.register("mission")}
        />
        <TextAreaField
          label="Versiculo do hero"
          placeholder="Texto biblico exibido no banner"
          maxLength={TEXTAREA_MAX}
          error={form.formState.errors.heroVerse?.message}
          {...form.register("heroVerse")}
        />
      </ProfileSection>
    </form>
  );
}
