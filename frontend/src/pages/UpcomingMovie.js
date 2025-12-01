import React from "react";
import Banner from "../components/Banner";
import UpcomingComponent from "../components/UpcomingComponent";
import ReviewHighlights from "../components/ReviewHighlights"; // Import component Review
import "../css/Upcoming.css"; 

function Upcoming() {
  return (
    <div className="upcoming-page">
      {/* --- BANNER --- */}
      <Banner
        title="Phim Sắp Chiếu"
        description="Đếm ngược ngày ra mắt các siêu phẩm điện ảnh được mong chờ nhất năm. Đặt vé sớm (Early Bird) để nhận ưu đãi độc quyền!"
        listItems={[
          "Xem trailer & thông tin hậu trường độc quyền",
          "Đăng ký nhận thông báo khi mở bán vé",
          "Cơ hội tham gia các buổi công chiếu sớm (Sneak Show)"
        ]}
        bannerText=""
        imageUrl="https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=1920&q=80"
        hideButton={true}
      />

      {/* --- DANH SÁCH PHIM --- */}
      <section className="container py-5">
        <div className="section-header">
            <h2 className="section-title">Sắp Ra Mắt</h2>
            <p className="section-subtitle">
                Chuẩn bị tinh thần cho những cú nổ màn ảnh rộng sắp tới. Đừng bỏ lỡ!
            </p>
        </div>
        
        <div className="movies-wrapper">
            <UpcomingComponent />
        </div>
      </section>

      {/* --- BÌNH LUẬN NỔI BẬT-- */}
      <section className="review-section py-5">
        <div className="container">
            <div className="section-header">
                <h2 className="section-title">Review Sớm</h2>
                <p className="section-subtitle">
                    Đánh giá từ các nhà phê bình và khán giả may mắn xem suất chiếu sớm.
                </p>
            </div>
            
            <ReviewHighlights limit={6} />
        </div>
      </section>
    </div>
  );
}

export default Upcoming;