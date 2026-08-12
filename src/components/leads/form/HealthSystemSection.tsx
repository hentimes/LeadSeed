// import { CargasAgeModal } from './CargasAgeModal'; // TODO: Temporarily hidden. Do not delete. Will be used in future phases for detailed dependent tracking.

interface Props {
  rangoEdad: string;
  onRangoEdadChange: (val: string) => void;
  sistema: string;
  onSistemaChange: (val: string) => void;
  rangoRenta: string;
  onRangoRentaChange: (val: string) => void;
  isapre: string;
  onIsapreChange: (val: string) => void;
  numeroCargas: string;
  onNumeroCargasChange: (val: string) => void;
  edadCargas: string; // JSON string of array
  onEdadCargasChange: (val: string) => void;
}

const ISAPRES = [
  "Banmédica", "Colmena", "Consalud", "Cruz Blanca",
  "Esencial", "Nueva Masvida", "Vida Tres", "Otra"
];

const RENTAS = [
  "Menor a $500.000",
  "$500.000 - $1.000.000",
  "$1.000.000 - $2.000.000",
  "Mayor a $2.000.000"
];

// const CARGAS_OPTIONS = ["0", "1", "2", "3", "4+"]; // TODO: Temporarily hidden. Will be used in future phases for dependent tracking.

export function HealthSystemSection({
  rangoEdad, onRangoEdadChange,
  sistema, onSistemaChange,
  rangoRenta, onRangoRentaChange,
  isapre, onIsapreChange,
  // numeroCargas, onNumeroCargasChange,
  // edadCargas, onEdadCargasChange
}: Props) {
  const isIsapre = sistema === 'Isapre';
  const isFonasa = sistema === 'Fonasa';

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-[120px_1fr_1fr] gap-3">
        <div>
          <label className="mb-1 block text-[10px] font-bold text-slate-500 uppercase tracking-wide">Edad</label>
          <select
            value={rangoEdad}
            onChange={(e) => onRangoEdadChange(e.target.value)}
            className="w-full rounded-[6px] border border-slate-200 px-3 py-1.5 text-[13px] text-slate-800 font-medium bg-white focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all cursor-pointer"
          >
            <option value="">Exacta o Rango...</option>
            <option value="Menor a 30">Menor a 30</option>
            <option value="30-39">30 a 39 años</option>
            <option value="40-49">40 a 49 años</option>
            <option value="50-59">50 a 59 años</option>
            <option value="60+">60 años o más</option>
          </select>
        </div>

        <div>
          <label className="mb-1 block text-[10px] font-bold text-slate-500 uppercase tracking-wide">Sistema</label>
          <select
            value={sistema}
            onChange={(e) => {
              onSistemaChange(e.target.value);
              onRangoRentaChange('');
              onIsapreChange('');
              // onNumeroCargasChange('');
              // onEdadCargasChange('');
            }}
            className="w-full rounded-[6px] border border-slate-200 px-3 py-1.5 text-[13px] text-slate-800 font-medium bg-white focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all cursor-pointer"
          >
            <option value="Fonasa">Fonasa</option>
            <option value="Isapre">Isapre</option>
          </select>
        </div>

        {isFonasa && (
          <div>
            <label className="mb-1 block text-[10px] font-bold text-slate-500 uppercase tracking-wide">Renta Liquida (aprox)</label>
            <select
              value={rangoRenta}
              onChange={(e) => onRangoRentaChange(e.target.value)}
              className="w-full rounded-[6px] border border-slate-200 px-3 py-1.5 text-[13px] text-slate-800 font-medium bg-white focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all cursor-pointer"
            >
              <option value="">Seleccione...</option>
              {RENTAS.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
        )}

        {isIsapre && (
          <div>
            <label className="mb-1 block text-[10px] font-bold text-slate-500 uppercase tracking-wide">Isapre Actual</label>
            <select
              value={isapre}
              onChange={(e) => onIsapreChange(e.target.value)}
              className="w-full rounded-[6px] border border-slate-200 px-3 py-1.5 text-[13px] text-slate-800 font-medium bg-white focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all cursor-pointer"
            >
              <option value="">Seleccione...</option>
              {ISAPRES.map(i => <option key={i} value={i}>{i}</option>)}
            </select>
          </div>
        )}

        {(!isFonasa && !isIsapre) && (
          <div className="hidden sm:block"></div>
        )}
      </div>

      {/* TODO: Temporarily hidden. Do not delete this block. Will be reactivated later to collect dependents' ages.
      {isIsapre && (
        <div className="grid grid-cols-2 gap-3 items-end">
          <div>
            <label className="mb-1 block text-[10px] font-bold text-slate-500 uppercase tracking-wide">Número de Cargas</label>
            <select
              value={numeroCargas}
              onChange={(e) => onNumeroCargasChange(e.target.value)}
              className="w-full rounded-[6px] border border-slate-200 px-3 py-1.5 text-[13px] text-slate-800 font-medium bg-white focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all cursor-pointer"
            >
              <option value="">Seleccione...</option>
              {CARGAS_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="flex items-center h-[34px]">
             <CargasAgeModal 
                numeroCargas={numeroCargas} 
                edadCargas={edadCargas} 
                onChange={onEdadCargasChange} 
             />
          </div>
        </div>
      )}
      */}
    </div>
  );
}
