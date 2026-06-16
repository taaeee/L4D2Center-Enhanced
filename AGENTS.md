# Instrucciones para Agentes de IA

## Estilos y Diseño (CSS)
- **Framework Principal:** Este proyecto utiliza **Tailwind CSS v4**.
- **Regla de Oro:** De ahora en adelante, **TODOS** los cambios de estilo, nuevos componentes o modificaciones en la interfaz deben realizarse utilizando **clases de utilidad de Tailwind** directamente en los archivos JSX/HTML/JS.
- **Vanilla CSS:** Evita escribir nuevas reglas de CSS puro (Vanilla CSS). 
- **Mantenimiento:** Si necesitas modificar un componente existente que usa Vanilla CSS, evalúa la posibilidad de refactorizarlo para que use Tailwind. Si debes tocar `inject.css`, intenta usar directivas de Tailwind como `@apply` en lugar de CSS tradicional, siempre que sea seguro y no rompa los estilos originales de la página inyectada.
- **Estética:** Asegúrate de seguir las directrices de diseño modernas, utilizando paletas coherentes y micro-interacciones (hover, focus, animaciones) nativas de Tailwind para mantener una sensación visual "Premium".
