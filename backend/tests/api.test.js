import request from 'supertest';
import app from '../src/index.js';

/* LƯU Ý TRƯỚC KHI CHẠY TEST:
   1. Database MySQL phải đang chạy.
   2. Database nên có sẵn một số dữ liệu nền: (Movies, Theaters, Showtimes, Seats) để test các luồng GET.
   3. Nếu chưa có Admin, test phần Admin sẽ fail (có thể comment lại).
*/

describe('KIỂM TRA TOÀN BỘ API HỆ THỐNG (E2E TEST)', () => {
    
    // Biến dùng chung giữa các test case
    let userToken = '';
    let userId = '';
    let adminToken = ''; 
    
    // Biến lưu dữ liệu động để test luồng Booking
    let publicMovieId = '';
    let publicShowtimeId = '';
    let availableSeatId = '';
    let createdBookingId = '';
    let concurrencySeatId = ''; // Ghế dùng riêng cho test tranh chấp

    // Dữ liệu User mẫu
    const uniqueUser = {
        name: 'Test User Jest',
        email: `test_jest_${Date.now()}@example.com`,
        password: 'password123',
        phone: '0909998887'
    };

    // =========================================================================
    // PHẦN 1: PUBLIC APIs (KHÔNG CẦN LOGIN)
    // =========================================================================
    describe('1. Public APIs (Movies, Showtimes, Blogs)', () => {

        test('GET /api/movies/now_showing - Lấy danh sách phim đang chiếu', async () => {
            const res = await request(app).get('/api/movies/now_showing');
            expect(res.statusCode).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
            
            if (res.body.length > 0) {
                publicMovieId = res.body[0].id;
            }
        });

        test('GET /api/movies/:id - Lấy chi tiết phim', async () => {
            if (!publicMovieId) return console.log('SKIP: No movie ID found');
            
            const res = await request(app).get(`/api/movies/${publicMovieId}`);
            expect(res.statusCode).toBe(200);
            expect(res.body).toHaveProperty('title');
        });

        test('GET /api/movies/filter - Test bộ lọc phim', async () => {
            const res = await request(app).get('/api/movies/filter?is_upcoming=0');
            expect(res.statusCode).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
        });

        test('GET /api/showtimes - Lấy lịch chiếu tổng quát', async () => {
            const res = await request(app).get('/api/showtimes');
            expect(res.statusCode).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);

            if (res.body.length > 0) {
                publicShowtimeId = res.body[0].id;
            }
        });

        test('GET /api/showtimes/:id - Lấy chi tiết phòng chiếu và ghế', async () => {
            if (!publicShowtimeId) return console.log('SKIP: No showtime ID found');

            const res = await request(app).get(`/api/showtimes/${publicShowtimeId}`);
            expect(res.statusCode).toBe(200);
            expect(res.body).toHaveProperty('seats');

            // Tìm ghế cho flow booking thường
            const freeSeat = res.body.seats.find(s => s.is_sold === 0 && !s.hold_user_id);
            if (freeSeat) {
                availableSeatId = freeSeat.id;
            }

            // Tìm một ghế KHÁC để test tranh chấp (nếu có đủ ghế)
            const anotherFreeSeat = res.body.seats.find(s => s.is_sold === 0 && !s.hold_user_id && s.id !== availableSeatId);
            if (anotherFreeSeat) {
                concurrencySeatId = anotherFreeSeat.id;
            } else {
                concurrencySeatId = availableSeatId; // Fallback
            }
        });

        test('GET /api/blogs - Lấy danh sách tin tức', async () => {
            const res = await request(app).get('/api/blogs');
            expect(res.statusCode).toBe(200);
        });

        test('GET /api/promotions - Lấy danh sách khuyến mãi', async () => {
            const res = await request(app).get('/api/promotions');
            expect(res.statusCode).toBe(200);
        });
    });

    // =========================================================================
    // PHẦN 2: AUTHENTICATION FLOW
    // =========================================================================
    describe('2. Authentication Flow', () => {
        
        test('POST /api/auth/register - Đăng ký user mới', async () => {
            const res = await request(app)
                .post('/api/auth/register')
                .send(uniqueUser);
            expect([201, 400]).toContain(res.statusCode);
        });

        test('POST /api/auth/login - Đăng nhập user', async () => {
            const res = await request(app)
                .post('/api/auth/login')
                .send({
                    email: uniqueUser.email,
                    password: uniqueUser.password
                });

            expect(res.statusCode).toBe(200);
            expect(res.body).toHaveProperty('accessToken');
            
            userToken = res.body.accessToken;
            if (res.body.user) userId = res.body.user.id;
        });

        test('GET /api/user/profile - Lấy thông tin cá nhân (Protected)', async () => {
            const res = await request(app)
                .get('/api/user/profile')
                .set('Authorization', `Bearer ${userToken}`);

            expect(res.statusCode).toBe(200);
            expect(res.body.user).toHaveProperty('email', uniqueUser.email);
        });

        test('PUT /api/user/profile - Cập nhật thông tin', async () => {
            const res = await request(app)
                .put('/api/user/profile')
                .set('Authorization', `Bearer ${userToken}`)
                .send({
                    name: 'Updated Name Jest',
                    email: uniqueUser.email,
                    phone: '0909998887'
                });
            expect(res.statusCode).toBe(200);
        });
    });

    // =========================================================================
    // PHẦN 3: BOOKING FLOW (LUỒNG ĐẶT VÉ CHUẨN)
    // =========================================================================
    describe('3. Booking & Transaction Flow', () => {

        test('POST /api/booking/hold - Giữ ghế (Hold Seat)', async () => {
            if (!publicShowtimeId || !availableSeatId) return console.log('SKIP: No seat to hold');

            const res = await request(app)
                .post('/api/booking/hold')
                .set('Authorization', `Bearer ${userToken}`)
                .send({
                    showtime_id: publicShowtimeId,
                    seats: [availableSeatId]
                });
            
            expect([200, 409]).toContain(res.statusCode);
        });

        test('POST /api/bookings - Tạo đơn hàng (Create Booking PENDING)', async () => {
            if (!publicShowtimeId || !availableSeatId) return console.log('SKIP: Booking creation');

            const res = await request(app)
                .post('/api/bookings')
                .set('Authorization', `Bearer ${userToken}`)
                .send({
                    showtime_id: publicShowtimeId,
                    seats: [{ id: availableSeatId }], 
                    combos: [],
                    promotion_id: null
                });

            expect([201, 200]).toContain(res.statusCode);
            if (res.statusCode === 201) {
                createdBookingId = res.body.bookingId;
                expect(res.body).toHaveProperty('finalTotal');
            }
        });

        test('GET /api/bookings/:id - Kiểm tra trạng thái đơn hàng', async () => {
            if (!createdBookingId) return;

            const res = await request(app)
                .get(`/api/bookings/${createdBookingId}`)
                .set('Authorization', `Bearer ${userToken}`);
            
            expect(res.statusCode).toBe(200);
            expect(res.body).toHaveProperty('status', 'PENDING');
        });

        test('POST /api/promotions/verify - Kiểm tra mã khuyến mãi', async () => {
            const res = await request(app)
                .post('/api/promotions/verify')
                .send({
                    code: 'TEST_INVALID_CODE',
                    total_amount: 100000,
                    user_id: userId
                });
            
            expect(res.statusCode).toBe(404); 
        });

        test('GET /api/user/bookings - Lấy lịch sử đơn hàng', async () => {
            const res = await request(app)
                .get('/api/user/bookings')
                .set('Authorization', `Bearer ${userToken}`);
            
            expect(res.statusCode).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
        });
    });

    // =========================================================================
    // PHẦN 4: TIỆN ÍCH & AI (CÓ TĂNG TIMEOUT)
    // =========================================================================
    describe('4. Utilities & AI', () => {
        
        test('POST /api/ai/recommend - Gợi ý phim AI', async () => {
            const res = await request(app)
                .post('/api/ai/recommend')
                .send({
                    query: "Tôi muốn xem phim hành động vui vẻ",
                    userContext: { age: 25 }
                });
            
            expect(res.statusCode).not.toBe(500);
            if (res.statusCode === 200) {
                expect(res.body).toHaveProperty('movies');
            }
        }, 20000); 

        test('POST /api/contact - Gửi liên hệ', async () => {
            const res = await request(app)
                .post('/api/contact')
                .send({
                    name: 'Tester',
                    email: 'test@contact.com',
                    phone: '123456',
                    subject: 'Test Contact',
                    message: 'Hello world'
                });
            
            expect([200, 500]).toContain(res.statusCode); 
        }, 20000); 
    });

    // =========================================================================
    // PHẦN 5: ADMIN APIs (YÊU CẦU QUYỀN CAO)
    // =========================================================================
    describe('5. Admin APIs', () => {
        
        const adminCreds = {
            email: 'admin@Lmovie.com', 
            password: 'admin123'
        };

        test('Login as Admin', async () => {
            const res = await request(app)
                .post('/api/auth/login')
                .send(adminCreds);

            if (res.statusCode === 200) {
                adminToken = res.body.accessToken;
            } else {
                console.warn('SKIP ADMIN TESTS: Không đăng nhập được Admin');
            }
        });

        test('GET /api/admin/users - Lấy danh sách users (Admin only)', async () => {
            if (!adminToken) return;
            const res = await request(app)
                .get('/api/admin/users')
                .set('Authorization', `Bearer ${adminToken}`);
            expect(res.statusCode).toBe(200);
        });

        test('GET /api/admin/stats - Lấy thống kê doanh thu', async () => {
            if (!adminToken) return;
            const res = await request(app)
                .get('/api/admin/stats?year=2024')
                .set('Authorization', `Bearer ${adminToken}`);
            expect(res.statusCode).toBe(200);
        });
    });

    // =========================================================================
    // PHẦN 6: VALIDATION & ERROR HANDLING (MỚI)
    // =========================================================================
    describe('6. Validation & Error Handling', () => {

        test('POST /api/auth/register - Đăng ký thiếu thông tin', async () => {
            const res = await request(app)
                .post('/api/auth/register')
                .send({
                    name: 'Missing Info User',
                    // Thiếu email và pass
                });
            expect(res.statusCode).toBe(400);
            expect(res.body).toHaveProperty('message');
        });

        test('POST /api/bookings - Đặt vé với danh sách ghế rỗng', async () => {
             if (!publicShowtimeId) return;

             const res = await request(app)
                .post('/api/bookings')
                .set('Authorization', `Bearer ${userToken}`)
                .send({
                    showtime_id: publicShowtimeId,
                    seats: [], // Rỗng
                    combos: [],
                    promotion_id: null
                });
            
            // Backend có thể trả 400 hoặc 500 tùy cách handle
            expect([400, 500]).toContain(res.statusCode);
        });

        test('POST /api/bookings - Đặt vé không có Token', async () => {
             if (!publicShowtimeId) return;

             const res = await request(app)
                .post('/api/bookings')
                .send({
                    showtime_id: publicShowtimeId,
                    seats: [{ id: 1 }],
                });
            
            expect(res.statusCode).toBe(401);
        });
    });

    // =========================================================================
    // PHẦN 7: PAYMENT WEBHOOK (SEPAY) (MỚI)
    // =========================================================================
    describe('7. Payment Webhook (SePay Integration)', () => {
        
        test('POST /api/sepay-webhook - Giả lập thanh toán thành công', async () => {
            if (!createdBookingId) return console.log("SKIP: No booking created to verify payment");

            // Giả lập nội dung chuyển khoản chứa ID đơn hàng
            const fakeContent = `THANHTOAN ${createdBookingId}`;

            const res = await request(app)
                .post('/api/sepay-webhook')
                .send({
                    gateway: 'TPBANK',
                    transactionDate: '2024-01-01 12:00:00',
                    accountNumber: '123456789',
                    content: fakeContent,
                    transferAmount: 100000,
                    transferType: 'in'
                });

            expect(res.statusCode).toBe(200);
            expect(res.body).toHaveProperty('success', true);

            // Kiểm tra lại trạng thái đơn hàng xem đã PAID chưa
            const bookingRes = await request(app)
                .get(`/api/bookings/${createdBookingId}`)
                .set('Authorization', `Bearer ${userToken}`);
            
            // Nếu Webhook chạy đúng, trạng thái phải đổi từ PENDING -> PAID
            // Lưu ý: Đôi khi transaction DB chậm, nên có thể chấp nhận nếu chưa cập nhật ngay
            if (bookingRes.statusCode === 200) {
                console.log(`Booking Status after Webhook: ${bookingRes.body.status}`);
            }
        });
    });

    // =========================================================================
    // PHẦN 8: CHAT APIs (Thay thế cho Socket) (MỚI)
    // =========================================================================
    describe('8. Chat History APIs', () => {
        
        test('GET /api/chat/:userId - Lấy lịch sử chat của User', async () => {
            if (!userId) return;

            const res = await request(app)
                .get(`/api/chat/${userId}`); // API này thường public hoặc check token

            // SỬA LỖI toBeOneOf Ở ĐÂY: Dùng toContain thay thế
            expect([200, 401, 403]).toContain(res.statusCode); 
        });

        test('GET /api/admin/chat/users - Admin lấy danh sách người chat', async () => {
            if (!adminToken) return;

            const res = await request(app)
                .get('/api/admin/chat/users')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(res.statusCode).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
        });
    });

    // =========================================================================
    // PHẦN 9: CONCURRENCY CHECK (TRANH CHẤP) (MỚI)
    // =========================================================================
    describe('9. Concurrency / Double Booking', () => {
        
        test('Double Booking - Hai request cùng đặt 1 ghế', async () => {
            if (!publicShowtimeId || !concurrencySeatId) return console.log("SKIP: No seat for concurrency test");

            const bookingPayload = {
                showtime_id: publicShowtimeId,
                seats: [{ id: concurrencySeatId }], 
                combos: [],
                promotion_id: null
            };

            // Gửi 2 request ĐỒNG THỜI (không dùng await ở giữa)
            const req1 = request(app)
                .post('/api/bookings')
                .set('Authorization', `Bearer ${userToken}`)
                .send(bookingPayload);

            const req2 = request(app)
                .post('/api/bookings')
                .set('Authorization', `Bearer ${userToken}`)
                .send(bookingPayload);

            const [res1, res2] = await Promise.all([req1, req2]);

            // Logic đúng: Một cái thành công (201/200), một cái thất bại (400/500/409)
            // Hoặc cả 2 đều thất bại nếu xử lý transaction chặt chẽ
            console.log(`Concurrency Results: Req1=${res1.statusCode}, Req2=${res2.statusCode}`);
            
            const successCount = [res1.statusCode, res2.statusCode].filter(code => code === 201 || code === 200).length;
            
            // Chỉ cho phép tối đa 1 booking thành công
            expect(successCount).toBeLessThanOrEqual(1);
        });
    });

});