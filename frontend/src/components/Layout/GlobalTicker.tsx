import { useState, useEffect } from 'react';
import supabase from '../../lib/supabaseClient';
import './GlobalTicker.css';

interface TickerItem {
  name: string;
  amount: number;
  paymentEmoji: string;
  type: 'consultation' | 'drug';
}

const getPaymentEmoji = (method: string | null): string => {
  if (!method) return '💰';
  const m = method.toLowerCase();
  if (m === 'cash') return '💵';
  if (m === 'card') return '💳';
  if (m === 'gpay') return '📱';
  if (m === 'cash+gpay' || m === 'gpay+cash') return '💵+📱';
  if (m === 'cash+card' || m === 'card+cash') return '💵+💳';
  if (m === 'card+gpay' || m === 'gpay+card') return '💳+📱';
  if (m.includes('skin') || m.includes('hair') || m.includes('nail')) return '💵+💳+📱';
  return '💰';
};

export default function GlobalTicker() {
  const [tickerItems, setTickerItems] = useState<TickerItem[]>([]);

  useEffect(() => {
    const fetchTickerData = async () => {
      try {
        const { data: visitData } = await supabase
          .from('visits')
          .select('fullname, consultation_fee, drug_fee, Procedure_Fee, paymentmethod')
          .order('visit_id', { ascending: false })
          .limit(5);

        const { data: medData } = await supabase
          .from('medicines')
          .select('patient_name, drug_fee, payment_method')
          .order('med_id', { ascending: false })
          .limit(5);

        const items: TickerItem[] = [];

        (visitData || []).forEach(v => {
          const total = (v.consultation_fee || 0) + (v.drug_fee || 0) + (v.Procedure_Fee || 0);
          items.push({
            name: v.fullname || 'Patient',
            amount: total,
            paymentEmoji: getPaymentEmoji(v.paymentmethod),
            type: 'consultation',
          });
        });

        (medData || []).forEach(m => {
          items.push({
            name: m.patient_name || 'Patient',
            amount: m.drug_fee || 0,
            paymentEmoji: getPaymentEmoji(m.payment_method),
            type: 'drug',
          });
        });

        setTickerItems(items);
      } catch (err) {
        console.error('Error fetching ticker data:', err);
      }
    };

    fetchTickerData();
  }, []);

  if (tickerItems.length === 0) return null;

  return (
    <div className="global-ticker-wrapper">
      <div className="global-ticker">
        <div className="global-ticker-track">
          {[...tickerItems, ...tickerItems].map((item, idx) => (
            <div key={idx} className={`global-ticker-item ${item.type}`}>
              <span className="global-ticker-badge">{item.type === 'consultation' ? '🩺' : '💊'}</span>
              <span className="global-ticker-name">{item.name}</span>
              <span className="global-ticker-amount">₹{item.amount.toLocaleString('en-IN')}</span>
              <span className="global-ticker-payment">{item.paymentEmoji}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
