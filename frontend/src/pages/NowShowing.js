import React from "react";
import Banner from "../components/Banner";
import NowShowingComponent from "../components/NowShowingComponent";
import ReviewHighlights from "../components/ReviewHighlights";
import "../css/NowShowing.css"; // Import file CSS mới

function NowShowing() {
  return (
    <div className="now-showing-page">
      {/* --- BANNER --- */}
      <Banner
        title="Phim Đang Chiếu"
        description="Cập nhật liên tục các bom tấn điện ảnh mới nhất tại hệ thống rạp. Đặt vé thả ga, không lo về giá!"
        listItems={[
          "Công nghệ chiếu phim IMAX Laser sắc nét",
          "Âm thanh Dolby Atmos sống động",
          "Đặt vé online nhanh chóng, tiện lợi"
        ]}
        bannerText=""
        imageUrl="/background/background_nowshowing.png" 
        hideButton={true}
      />

      {/* --- DANH SÁCH PHIM --- */}
      <section className="container py-5">
        <div className="section-header">
            <h2 className="section-title">Hiện Chúng Tôi Có Gì?</h2>
            <p className="section-subtitle">
                Khám phá những bộ phim hot nhất hiện đang công phá các phòng vé trên toàn quốc.
            </p>
        </div>
        
        <div className="movies-wrapper">
            {/* Component này sẽ hiển thị Grid phim */}
            <NowShowingComponent />
        </div>
      </section>

      {/* --- BÌNH LUẬN NỔI BẬT --- */}
      <section className="review-section py-5">
        <div className="container">
            <div className="section-header">
                <h2 className="section-title">Góc Bình Luận</h2>
                <p className="section-subtitle">
                    Lắng nghe những chia sẻ chân thực nhất từ cộng đồng khán giả.
                </p>
            </div>
            
            <ReviewHighlights limit={6} />
        </div>
      </section>
    </div>
  );
}

export default NowShowing;