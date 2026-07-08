import { Mail, MapPin, Phone } from "lucide-react";
import PageShell from "../components/layout/PageShell";
import RsacLocationMap from "../components/location/RsacLocationMap";
import BackButton from "../components/navigation/BackButton";
import { useContactDetails, useSiteSettings } from "../hooks/useData";
import { useLanguage } from "../hooks/useLanguage";

const ContactPage = () => {
  const contactDetails = useContactDetails();
  const { pageContent } = useSiteSettings();
  const { t } = useLanguage();
  const c = pageContent.contact;
  return (
    <PageShell
      eyebrow={t(c.eyebrow)}
      title={t(c.title)}
      intro={t(c.intro)}
      breadcrumbs={[
        { label: t("Home"), to: "/" },
        { label: t(c.eyebrow) },
      ]}
      actions={<BackButton fallback="/" label={t(c.backLabel)} />}
    >
      <div className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
        <article className="rounded-lg border border-slate-200 bg-white p-6 shadow-[0_16px_50px_rgba(18,50,74,0.06)]">
          <h2 className="text-2xl font-extrabold leading-snug text-[#102f46]">
            {t(contactDetails.title)}
          </h2>

          <div className="mt-6 space-y-5 text-sm leading-relaxed text-slate-700">
            <p className="flex gap-3">
              <MapPin className="mt-1 h-5 w-5 shrink-0 text-[#0f6f42]" aria-hidden="true" />
              <span>{t(contactDetails.address)}</span>
            </p>

            <p className="flex gap-3">
              <Mail className="mt-1 h-5 w-5 shrink-0 text-[#0f6f42]" aria-hidden="true" />
              <span className="break-words">{contactDetails.email}</span>
            </p>

            <p className="flex gap-3">
              <Phone className="mt-1 h-5 w-5 shrink-0 text-[#0f6f42]" aria-hidden="true" />
              <span>{t(contactDetails.phone)}<br />{t(contactDetails.mobile)}</span>
            </p>
          </div>
        </article>

        <div className="grid gap-5 md:grid-cols-2">
          {contactDetails.contacts.map((contact) => (
            <article
              key={contact.role}
              className="rounded-lg border border-slate-200 bg-white p-6 shadow-[0_16px_50px_rgba(18,50,74,0.06)]"
            >
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#0b6fa4]">
                {t(contact.role)}
              </p>

              <h2 className="mt-3 text-xl font-extrabold text-[#102f46]">
                {t(contact.name)}
              </h2>

              <p className="mt-4 text-sm leading-relaxed text-slate-600">
                {t(contact.information)}
              </p>

              <p className="mt-5 text-sm font-semibold leading-relaxed text-[#0f6f42]">
                {t(contact.detail)}
              </p>
            </article>
          ))}
        </div>
      </div>

      <div className="mt-7">
        <RsacLocationMap compact />
      </div>
    </PageShell>
  );
};

export default ContactPage;
