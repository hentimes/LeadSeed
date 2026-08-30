/**
 * SISTEMA DE DISENO DE LEADSEED
 *
 * Punto de entrada unico. Los componentes importan desde aca:
 *
 *   import { Card, Button, PageShell, SectionTitle } from '../design';
 *
 * Reglas:
 *  - Los colores, radios y tamanos viven en tokens.css. No escribir
 *    valores literales (#6C4CF6, text-[13px]) en los componentes.
 *  - Si falta una variante, se agrega a la primitiva, no se resuelve con
 *    clases sueltas en el consumidor.
 */
export { Card, Panel } from './Surface';
export { Button, IconButton } from './Button';
export { Badge } from './Badge';
export { Avatar, AvatarStack } from './Avatar';
export { Chip, SegmentedControl, CountBadge } from './Chip';
export { Skeleton } from './Skeleton';
export { PageShell, SectionHeader, EmptyState, LoadError } from './PageShell';
export { Field, Input, Textarea, Select, Checkbox } from './Field';
export { PageTitle, SectionTitle, CardTitle, GroupLabel, Body, Hint } from './Text';
export { Modal } from './Modal';
export { Section, Block, Notice } from './Section';
export { Switch, SettingRow, SettingGroup } from './SettingRow';
export { ListPanel, ListRow, ListPagination, clasesDeFila, tonoDeFila } from './ListPanel';
export type { ListDensity } from './ListPanel';
