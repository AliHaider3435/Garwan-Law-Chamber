const WHATSAPP_URL =
  'https://wa.me/923008761878?text=Hello%2C%20I%20would%20like%20to%20contact%20Garwan%20Law%20Chamber.';

export default function WhatsAppLink({ className = '' }: { className?: string }) {
  return (
    <a
      className={`whatsapp-link ${className}`.trim()}
      href={WHATSAPP_URL}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Contact Garwan Law Chamber on WhatsApp"
      title="Contact Garwan Law Chamber on WhatsApp"
    >
      <svg viewBox="0 0 32 32" aria-hidden="true">
        <path
          fill="currentColor"
          d="M16.02 3.2A12.68 12.68 0 0 0 5.1 22.33L3.4 28.55l6.37-1.67A12.68 12.68 0 1 0 16.02 3.2Zm0 23.04c-1.9 0-3.77-.51-5.4-1.48l-.39-.23-3.78.99 1.01-3.68-.25-.4a10.34 10.34 0 1 1 8.81 4.8Zm5.68-7.75c-.31-.16-1.84-.91-2.13-1.02-.29-.1-.5-.16-.71.16-.21.31-.81 1.02-.99 1.23-.19.21-.37.23-.68.08-.31-.16-1.31-.48-2.49-1.53-.92-.82-1.55-1.84-1.73-2.15-.18-.31-.02-.48.14-.64.14-.14.31-.37.47-.55.16-.19.21-.31.31-.53.1-.21.05-.39-.03-.55-.08-.16-.71-1.71-.97-2.34-.26-.62-.52-.53-.71-.54h-.6c-.21 0-.55.08-.84.39-.29.31-1.1 1.07-1.1 2.62 0 1.55 1.13 3.05 1.29 3.26.16.21 2.22 3.39 5.37 4.75.75.32 1.34.51 1.8.65.76.24 1.45.2 2 .12.61-.09 1.84-.75 2.1-1.47.26-.73.26-1.35.18-1.48-.08-.13-.29-.21-.6-.37Z"
        />
      </svg>
    </a>
  );
}
