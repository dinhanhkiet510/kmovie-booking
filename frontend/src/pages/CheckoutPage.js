import React, { useEffect, useState } from 'react';
import { createApi } from "../utils/api";

export default function CheckoutPage({ booking }) {
  // booking: { showtimeId, seats: [{id, code, price}], movie, cinema, total }
  const api = createApi();
  const [comboQty, setComboQty] = useState({ popcorn: 0, soda: 0 });
  const [paymentMethod, setPaymentMethod] = useState('momo');
  const [loading, setLoading] = useState(false);

  const combos = {
    popcorn: { name: 'Bắp + Nước', price: 50000 },
    soda: { name: 'Nước ngọt', price: 30000 }
  };

  const comboTotal = comboQty.popcorn * combos.popcorn.price + comboQty.soda * combos.soda.price;
  const seatsTotal = booking.seats.reduce((s, st) => s + st.price, 0);
  const grandTotal = seatsTotal + comboTotal;

  const handlePay = async () => {
    setLoading(true);
    try {
      // Create an order on our backend
      const res = await api.post('/payments/create-order', {
        showtime_id: booking.showtimeId,
        seats: booking.seats.map(s => s.id),
        combos: comboQty,
        payment_method: paymentMethod,
        amount: grandTotal
      });

      // Backend returns { payment_url, order_id }
      const { payment_url, order_id } = res.data;

      // For hosted payment (MoMo/VNPAY), redirect the user
      if (payment_url) {
        window.location.href = payment_url;
        return;
      }

      // For native flow (e.g., generate QR or open modal) you may handle differently
      // We'll handle by polling the order status after redirect / webhook

    } catch (err) {
      console.error(err);
      alert('Tạo đơn thất bại');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto bg-[#111] p-6 rounded-xl">
      <h2 className="text-2xl font-bold mb-4">Thanh toán</h2>

      <div className="mb-4">
        <h3 className="font-semibold">Combo</h3>
        <div className="flex items-center gap-4 mt-2">
          <div className="flex items-center gap-2">
            <button onClick={() => setComboQty(q => ({...q, popcorn: Math.max(0, q.popcorn-1)}))}>-</button>
            <div>{comboQty.popcorn}</div>
            <button onClick={() => setComboQty(q => ({...q, popcorn: q.popcorn+1}))}>+</button>
            <div className="ml-2">{combos.popcorn.name} — {combos.popcorn.price.toLocaleString()}đ</div>
          </div>
        </div>
        <div className="flex items-center gap-4 mt-2">
          <div className="flex items-center gap-2">
            <button onClick={() => setComboQty(q => ({...q, soda: Math.max(0, q.soda-1)}))}>-</button>
            <div>{comboQty.soda}</div>
            <button onClick={() => setComboQty(q => ({...q, soda: q.soda+1}))}>+</button>
            <div className="ml-2">{combos.soda.name} — {combos.soda.price.toLocaleString()}đ</div>
          </div>
        </div>
      </div>

      <div className="mb-4">
        <h3 className="font-semibold">Phương thức thanh toán</h3>
        <div className="flex flex-col gap-2 mt-2">
          <label className="p-2 bg-[#222] rounded"><input type="radio" checked={paymentMethod==='momo'} onChange={()=>setPaymentMethod('momo')} /> MoMo</label>
          <label className="p-2 bg-[#222] rounded"><input type="radio" checked={paymentMethod==='vnpay'} onChange={()=>setPaymentMethod('vnpay')} /> VNPAY</label>
          <label className="p-2 bg-[#222] rounded"><input type="radio" checked={paymentMethod==='zalopay'} onChange={()=>setPaymentMethod('zalopay')} /> ZaloPay</label>
        </div>
      </div>

      <div className="border-t border-gray-700 pt-4 mt-4">
        <div className="flex justify-between"><span>Ghế</span><strong>{seatsTotal.toLocaleString()}đ</strong></div>
        <div className="flex justify-between"><span>Combo</span><strong>{comboTotal.toLocaleString()}đ</strong></div>
        <div className="flex justify-between mt-2 text-xl font-bold"><span>Tổng</span><strong>{grandTotal.toLocaleString()}đ</strong></div>
      </div>

      <button onClick={handlePay} disabled={loading} className="mt-6 w-full bg-red-600 py-3 rounded">{loading ? 'Đang xử lý...' : 'Thanh toán'}</button>
    </div>
  );
}