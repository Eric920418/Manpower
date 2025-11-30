"use client";

interface FormField {
  label: string;
  placeholder: string;
  icon: string;
  required: boolean;
  rows?: number;
}

interface ContactInfo {
  icon: string;
  title: string;
  content: string;
  description: string;
  link: string;
}

interface ContactSectionProps {
  badge: string;
  title: string;
  description: string;
  formFields: {
    name: FormField;
    email: FormField;
    phone: FormField;
    message: FormField;
  };
  submitButton: {
    text: string;
    icon: string;
  };
  contactInfo: ContactInfo[];
}

export default function ContactSection({
  badge,
  title,
  description,
  formFields,
  submitButton,
  contactInfo,
}: ContactSectionProps) {
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // 表單提交邏輯（未來可接 API）
    console.log("表單已提交");
  };

  return (
    <section className="bg-bg-primary py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* 標題區塊 */}
        <div className="text-center mb-16 space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-brand-primary/10 rounded-full border border-brand-primary/20">
            <span className="material-symbols-outlined text-brand-secondary text-sm">
              support_agent
            </span>
            <span className="text-sm font-semibold text-brand-secondary">
              {badge}
            </span>
          </div>

          <h2 className="text-4xl md:text-5xl font-black text-text-primary tracking-tight">
            {title}
          </h2>

          <p className="text-lg text-text-secondary max-w-2xl mx-auto">
            {description}
          </p>
        </div>

        {/* 主要內容區塊：表單 + 聯絡資訊 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* 左側：聯絡表單 */}
          <div className="bg-bg-primary border border-border rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* 姓名欄位 */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-semibold text-text-primary">
                  <span className="material-symbols-outlined text-brand-primary text-base">
                    {formFields.name.icon}
                  </span>
                  {formFields.name.label}
                  {formFields.name.required && (
                    <span className="text-red-500">*</span>
                  )}
                </label>
                <input
                  type="text"
                  required={formFields.name.required}
                  placeholder={formFields.name.placeholder}
                  className="w-full px-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent transition-all duration-200 bg-bg-primary text-text-primary placeholder:text-text-secondary/50"
                />
              </div>

              {/* 電子信箱欄位 */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-semibold text-text-primary">
                  <span className="material-symbols-outlined text-brand-primary text-base">
                    {formFields.email.icon}
                  </span>
                  {formFields.email.label}
                  {formFields.email.required && (
                    <span className="text-red-500">*</span>
                  )}
                </label>
                <input
                  type="email"
                  required={formFields.email.required}
                  placeholder={formFields.email.placeholder}
                  className="w-full px-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent transition-all duration-200 bg-bg-primary text-text-primary placeholder:text-text-secondary/50"
                />
              </div>

              {/* 聯絡電話欄位 */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-semibold text-text-primary">
                  <span className="material-symbols-outlined text-brand-primary text-base">
                    {formFields.phone.icon}
                  </span>
                  {formFields.phone.label}
                  {formFields.phone.required && (
                    <span className="text-red-500">*</span>
                  )}
                </label>
                <input
                  type="tel"
                  required={formFields.phone.required}
                  placeholder={formFields.phone.placeholder}
                  className="w-full px-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent transition-all duration-200 bg-bg-primary text-text-primary placeholder:text-text-secondary/50"
                />
              </div>

              {/* 訊息內容欄位 */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-semibold text-text-primary">
                  <span className="material-symbols-outlined text-brand-primary text-base">
                    {formFields.message.icon}
                  </span>
                  {formFields.message.label}
                  {formFields.message.required && (
                    <span className="text-red-500">*</span>
                  )}
                </label>
                <textarea
                  required={formFields.message.required}
                  rows={formFields.message.rows || 5}
                  placeholder={formFields.message.placeholder}
                  className="w-full px-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent transition-all duration-200 bg-bg-primary text-text-primary placeholder:text-text-secondary/50 resize-none"
                />
              </div>

              {/* 送出按鈕 */}
              <button
                type="submit"
                className="w-full py-4 bg-brand-primary hover:bg-brand-accent text-text-on-brand font-bold text-lg rounded-lg transition-all duration-300 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]"
              >
                <span>{submitButton.text}</span>
                <span className="material-symbols-outlined text-xl">
                  {submitButton.icon}
                </span>
              </button>
            </form>
          </div>

          {/* 右側：聯絡資訊卡片 */}
          <div className="space-y-6">
            {contactInfo.map((info, index) => (
              <a
                key={index}
                href={info.link}
                className="block bg-gradient-to-br from-brand-primary/5 to-brand-accent/5 border border-brand-primary/20 rounded-2xl p-6 hover:shadow-xl hover:scale-[1.02] hover:border-brand-primary transition-all duration-300 group"
              >
                <div className="flex items-start gap-4">
                  {/* 圖示 */}
                  <div className="flex-shrink-0 w-14 h-14 bg-brand-primary rounded-full flex items-center justify-center shadow-lg group-hover:shadow-xl group-hover:scale-110 transition-all duration-300">
                    <span className="material-symbols-outlined text-text-on-brand text-2xl">
                      {info.icon}
                    </span>
                  </div>

                  {/* 內容 */}
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-text-primary mb-1">
                      {info.title}
                    </h3>
                    <p className="text-base font-semibold text-brand-secondary mb-1">
                      {info.content}
                    </p>
                    <p className="text-sm text-text-secondary">
                      {info.description}
                    </p>
                  </div>

                  {/* 箭頭 */}
                  <div className="flex-shrink-0">
                    <span className="material-symbols-outlined text-brand-primary text-xl group-hover:translate-x-1 transition-transform">
                      arrow_forward
                    </span>
                  </div>
                </div>
              </a>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
