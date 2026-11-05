// cabeçalho das páginas internas
export default function PageHeader({ crumbs, title, subtitle, children }) {
  // monta a trilha começando em "Início"
  const breadcrumbText = ['Início', ...crumbs].join(' / ')

  return (
    <header className="page-header">
      <div>
        <p className="breadcrumb">{breadcrumbText}</p>
        <h1 className="page-title">{title}</h1>
        {subtitle && <p className="page-subtitle">{subtitle}</p>}
      </div>
      {children}
    </header>
  )
}
