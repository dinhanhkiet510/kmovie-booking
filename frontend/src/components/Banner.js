import React, { useState } from "react";
import "../css/Home.css";
import { Link } from "react-router-dom";

function Banner({ title = "Mua vé xem phim Online trên",
                description = "Với nhiều ưu đãi hấp dẫn và kết nối với tất cả các rạp lớn phủ rộng khắp Việt Nam. Đặt vé ngay tại MoMo!",
                listItems = [
                    "Mua vé Online, trải nghiệm phim hay",
                    "Đặt vé an toàn trên MoMo",
                    "Tha hồ chọn chỗ ngồi, mua bắp nước tiện lợi",
                ],
                buttonText = "ĐẶT VÉ NGAY",
                imageUrl = "/background/background_cinema.png",
                hideButton = false
}) {

    const scrollToShowtimes = () => {
        const element = document.getElementById("showtimes");
        if (element) {
            element.scrollIntoView({ behavior: "smooth" });
        }
    };

    return (
        <section
        className="banner-section py-5 position-relative"
        style={{ backgroundColor: "#FEF1F9" }}
        >
        <div className="container">
            <div className="text_button_banner row align-items-center">
            {/* Text + Button */}
            <div className="col-md-6 mb-4 mb-md-0">
                <h1 className="display-5 fw-bold mb-4" style={{ lineHeight: "1.2" }}>
                {title} <span className="text-pink">Movie Booking</span>
                </h1>
                <p className="lead mb-2">{description}</p>
                <ul className="mb-4 tick-list">
                {listItems.map((item, i) => (
                    <li key={i}>{item}</li>
                ))}
                </ul>
                {!hideButton && (
                    <button to='/movies' className="btn-buy-tickets btn bg-pink btn-lg shadow-sm px-4 py-2 text-white" onClick={scrollToShowtimes}>
                    {buttonText}
                    </button>
                )}
            </div>

            {/* Hình ảnh */}
            <div className="col-md-6 position-relative text-center">
                <div className="position-relative">
                <img
                    src={imageUrl || "/background/background_cinema.png"}
                    alt="Movie"
                    className="img-fluid rounded shadow-lg"
                    style={{ maxHeight: "400px", objectFit: "cover" }}
                />
                <div
                    className="position-absolute top-0 start-0 w-100 h-100 rounded"
                    style={{
                    background:
                        "linear-gradient(135deg, rgba(0,0,0,0.3), rgba(0,0,0,0))",
                    }}
                ></div>
                </div>
            </div>
            </div>
        </div>
        </section>
    );
}

export default Banner;
