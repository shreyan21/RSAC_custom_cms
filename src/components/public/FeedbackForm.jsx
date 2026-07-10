import { useState } from "react";
import { CheckCircle2, Send } from "lucide-react";
import { useLanguage } from "../../hooks/useLanguage";
import { useContactDetails } from "../../hooks/useData";
import { submitCmsFeedback } from "../../data/cmsInteractions";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[\d+\-\s()]{7,}$/;

const initialForm = {
  name: "",
  email: "",
  address: "",
  country: "India",
  state: "Uttar Pradesh",
  district: "",
  phone: "",
  comments: "",
};

const FeedbackForm = () => {
  const { isHindi } = useLanguage();
  const contact = useContactDetails();
  const feedbackEmail = contact?.email || "director.rsac-up@rsac.up.gov.in";

  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});
  // false | "cms" (stored in Drupal) | "mail" (mailto fallback)
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const L = isHindi
    ? {
        title: "प्रतिक्रिया फॉर्म",
        intro:
          "वेबसाइट पर अपनी टिप्पणी एवं प्रतिक्रिया भेजने हेतु नीचे दिया फॉर्म भरें। आपके सुझाव हमारे लिए बहुमूल्य हैं। संपर्क विवरण देने पर हम आपके प्रश्नों का उत्तर दे सकेंगे।",
        mandatory: "* चिह्नित फ़ील्ड अनिवार्य हैं।",
        name: "नाम",
        email: "ईमेल आईडी",
        address: "डाक पता",
        country: "देश",
        state: "राज्य",
        district: "जनपद",
        phone: "दूरभाष संख्या",
        comments: "टिप्पणी / सुझाव",
        india: "भारत",
        other: "अन्य",
        submit: "प्रतिक्रिया भेजें",
        reset: "रीसेट करें",
        required: "यह फ़ील्ड आवश्यक है।",
        badEmail: "मान्य ईमेल आईडी दर्ज करें।",
        badPhone: "मान्य दूरभाष संख्या दर्ज करें।",
        okTitle: "धन्यवाद!",
        okBody:
          "आपका ईमेल ऐप आपकी प्रतिक्रिया के साथ खुल गया है। कृपया भेजने हेतु पुष्टि करें।",
        okBodyStored:
          "आपकी प्रतिक्रिया सफलतापूर्वक दर्ज हो गई है। आपके सुझाव के लिए धन्यवाद।",
        sending: "भेजा जा रहा है…",
        again: "एक और प्रतिक्रिया भेजें",
      }
    : {
        title: "Feedback Form",
        intro:
          "Complete the form below to send us your comments and feedback on the website. Your opinion and suggestions are very much appreciated. If you provide your contact information, we will be able to answer your questions.",
        mandatory: "Fields marked with * are mandatory.",
        name: "Name",
        email: "Email Id",
        address: "Postal Address",
        country: "Country",
        state: "State",
        district: "District",
        phone: "Phone No.",
        comments: "Comments / Suggestion",
        india: "India",
        other: "Other",
        submit: "Send Feedback",
        reset: "Reset",
        required: "This field is required.",
        badEmail: "Enter a valid email Id.",
        badPhone: "Enter a valid phone number.",
        okTitle: "Thank you!",
        okBody:
          "Your email app has opened with your feedback. Please confirm to send it.",
        okBodyStored:
          "Your feedback has been recorded successfully. Thank you for your suggestions.",
        sending: "Sending…",
        again: "Send another response",
      };

  const setField = (key) => (event) => {
    setForm((prev) => ({ ...prev, [key]: event.target.value }));
    setErrors((prev) => (prev[key] ? { ...prev, [key]: undefined } : prev));
  };

  const validate = () => {
    const next = {};
    ["name", "email", "address", "state", "district", "phone", "comments"].forEach(
      (key) => {
        if (!form[key].trim()) next[key] = L.required;
      }
    );
    if (form.email.trim() && !EMAIL_RE.test(form.email.trim()))
      next.email = L.badEmail;
    if (form.phone.trim() && !PHONE_RE.test(form.phone.trim()))
      next.phone = L.badPhone;
    return next;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (submitting) {
      return;
    }
    const next = validate();
    setErrors(next);
    if (Object.keys(next).length > 0) {
      return;
    }

    // Store the submission in the CMS so it works on machines without a mail
    // app; fall back to the visitor's email client when the CMS is offline.
    setSubmitting(true);
    const stored = await submitCmsFeedback({
      name: form.name.trim(),
      email: form.email.trim(),
      address: form.address.trim(),
      country: form.country.trim(),
      state: form.state.trim(),
      district: form.district.trim(),
      phone: form.phone.trim(),
      comments: form.comments.trim(),
    });
    setSubmitting(false);

    if (stored) {
      setSent("cms");
      return;
    }

    const body = [
      `${L.name}: ${form.name}`,
      `${L.email}: ${form.email}`,
      `${L.phone}: ${form.phone}`,
      `${L.address}: ${form.address}`,
      `${L.country}: ${form.country}`,
      `${L.state}: ${form.state}`,
      `${L.district}: ${form.district}`,
      "",
      `${L.comments}:`,
      form.comments,
    ].join("\n");

    const mailto = `mailto:${feedbackEmail}?subject=${encodeURIComponent(
      "Website Feedback"
    )}&body=${encodeURIComponent(body)}`;
    window.location.href = mailto;
    setSent("mail");
  };

  const handleReset = () => {
    setForm(initialForm);
    setErrors({});
    setSent(false);
  };

  if (sent) {
    return (
      <div className="rounded-lg border border-emerald-200 bg-emerald-50/70 p-6 text-center shadow-[0_16px_50px_rgba(18,50,74,0.06)]">
        <CheckCircle2
          className="mx-auto h-12 w-12 text-[#0f6f42]"
          aria-hidden="true"
        />
        <h2 className="mt-3 text-xl font-extrabold text-[#102f46]">{L.okTitle}</h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-slate-600">
          {sent === "cms" ? L.okBodyStored : L.okBody}
        </p>
        <button
          type="button"
          onClick={handleReset}
          className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-[#0f6f42] transition hover:bg-emerald-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0f6f42]"
        >
          {L.again}
        </button>
      </div>
    );
  }

  const fieldClass = (key) =>
    `min-h-11 w-full rounded-lg border bg-white px-3 py-2 text-sm font-semibold text-[#12324a] outline-none transition focus:border-[#0b6fa4]/60 focus:ring-2 focus:ring-[#0b6fa4]/15 ${
      errors[key] ? "border-red-400" : "border-slate-300"
    }`;

  const labelClass =
    "mb-1.5 block text-xs font-bold uppercase tracking-[0.12em] text-slate-500";

  const star = <span className="text-red-500">&nbsp;*</span>;
  const renderError = (key) =>
    errors[key] ? (
      <p className="mt-1 text-xs font-semibold text-red-500">{errors[key]}</p>
    ) : null;

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="relative overflow-hidden rounded-lg border border-slate-200 bg-white p-6 shadow-[0_16px_50px_rgba(18,50,74,0.06)]"
    >
      <span
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,#ff9933_0%,#ffffff_48%,#138808_100%)]"
      />
      <h2 className="text-2xl font-extrabold text-[#102f46]">{L.title}</h2>
      <p className="mt-2 text-sm leading-relaxed text-slate-600">{L.intro}</p>
      <p className="mt-1 text-xs font-semibold text-[#c2410c]">{L.mandatory}</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div>
          <label className={labelClass} htmlFor="fb-name">
            {L.name}
            {star}
          </label>
          <input
            id="fb-name"
            type="text"
            value={form.name}
            onChange={setField("name")}
            className={fieldClass("name")}
            aria-invalid={!!errors.name}
          />
          {renderError("name")}
        </div>

        <div>
          <label className={labelClass} htmlFor="fb-email">
            {L.email}
            {star}
          </label>
          <input
            id="fb-email"
            type="email"
            value={form.email}
            onChange={setField("email")}
            className={fieldClass("email")}
            aria-invalid={!!errors.email}
          />
          {renderError("email")}
        </div>

        <div className="sm:col-span-2">
          <label className={labelClass} htmlFor="fb-address">
            {L.address}
            {star}
          </label>
          <textarea
            id="fb-address"
            rows={2}
            value={form.address}
            onChange={setField("address")}
            className={`${fieldClass("address")} min-h-[3.5rem] resize-y`}
            aria-invalid={!!errors.address}
          />
          {renderError("address")}
        </div>

        <div>
          <label className={labelClass} htmlFor="fb-country">
            {L.country}
            {star}
          </label>
          <select
            id="fb-country"
            value={form.country}
            onChange={setField("country")}
            className={fieldClass("country")}
          >
            <option value="India">{L.india}</option>
            <option value="Other">{L.other}</option>
          </select>
        </div>

        <div>
          <label className={labelClass} htmlFor="fb-state">
            {L.state}
            {star}
          </label>
          <input
            id="fb-state"
            type="text"
            value={form.state}
            onChange={setField("state")}
            className={fieldClass("state")}
            aria-invalid={!!errors.state}
          />
          {renderError("state")}
        </div>

        <div>
          <label className={labelClass} htmlFor="fb-district">
            {L.district}
            {star}
          </label>
          <input
            id="fb-district"
            type="text"
            value={form.district}
            onChange={setField("district")}
            className={fieldClass("district")}
            aria-invalid={!!errors.district}
          />
          {renderError("district")}
        </div>

        <div>
          <label className={labelClass} htmlFor="fb-phone">
            {L.phone}
            {star}
          </label>
          <input
            id="fb-phone"
            type="tel"
            value={form.phone}
            onChange={setField("phone")}
            className={fieldClass("phone")}
            aria-invalid={!!errors.phone}
          />
          {renderError("phone")}
        </div>

        <div className="sm:col-span-2">
          <label className={labelClass} htmlFor="fb-comments">
            {L.comments}
            {star}
          </label>
          <textarea
            id="fb-comments"
            rows={5}
            value={form.comments}
            onChange={setField("comments")}
            className={`${fieldClass("comments")} min-h-[7rem] resize-y`}
            aria-invalid={!!errors.comments}
          />
          {renderError("comments")}
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={submitting}
          className="geo-btn-saffron inline-flex min-h-11 items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-bold text-white transition hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f97316] disabled:cursor-wait disabled:opacity-70"
        >
          <Send className="h-4 w-4" aria-hidden="true" />
          {submitting ? L.sending : L.submit}
        </button>
        <button
          type="button"
          onClick={handleReset}
          className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-slate-200 px-5 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0b6fa4]"
        >
          {L.reset}
        </button>
      </div>
    </form>
  );
};

export default FeedbackForm;
