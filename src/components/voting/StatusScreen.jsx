/** Pantalla centrada a todo lo alto, para mensajes de estado de la estación. */
export function StatusScreen({ icon: Icon, iconClass = 'text-navy-700 bg-navy-100', title, message, children, footer }) {
  return (
    <div className="relative flex min-h-full flex-col items-center justify-center bg-navy-50 px-6 py-10 text-center">
      <div className="flex max-w-2xl animate-fade-in flex-col items-center">
        {Icon && (
          <div className={`mb-6 flex size-24 items-center justify-center rounded-full sm:mb-8 sm:size-32 ${iconClass}`}>
            <Icon className="size-12 sm:size-16" strokeWidth={2.2} />
          </div>
        )}
        <h1 className="text-3xl font-bold leading-tight text-navy-950 sm:text-5xl">{title}</h1>
        {message && <p className="mt-4 text-xl leading-relaxed text-slate-600 sm:mt-5 sm:text-2xl">{message}</p>}
        {children && <div className="mt-10 w-full">{children}</div>}
      </div>
      {footer && <div className="absolute bottom-6 text-base text-slate-400">{footer}</div>}
    </div>
  );
}
