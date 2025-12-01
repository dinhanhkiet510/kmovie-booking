import React, { useState, useContext } from "react";
import axios from "axios";
import { FaCloudUploadAlt, FaSpinner, FaTimes } from "react-icons/fa";
// 1. Import AuthContext để lấy Token
import { AuthContext } from "../../Context/AuthContext"; 

export default function ImageUpload({ label, value, onChange }) {
  const [uploading, setUploading] = useState(false);
  // 2. Lấy accessToken
  const { accessToken } = useContext(AuthContext);

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Vui lòng chỉ chọn file hình ảnh!");
      return;
    }

    const formData = new FormData();
    formData.append("image", file);

    setUploading(true);
    try {
      // 3. Gửi request kèm Token trong Header (Authorization)
      const res = await axios.post("http://localhost:5000/api/upload", formData, {
        headers: { 
            "Content-Type": "multipart/form-data",
            "Authorization": `Bearer ${accessToken}`
        },
      });

      if (res.data.url) {
        onChange(res.data.url);
      }
    } catch (err) {
      console.error("Upload thất bại:", err);
      alert("Lỗi upload ảnh: " + (err.response?.data?.message || err.message));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="form-group">
      <label style={{fontWeight: "600", marginBottom: "5px", display: "block", color: "#555"}}>
        {label || "Hình ảnh"}
      </label>
      
      <div className="d-flex flex-column gap-2">
        {value ? (
          <div className="position-relative d-inline-block" style={{ width: "fit-content" }}>
            <img 
              src={value} 
              alt="Preview" 
              className="rounded border shadow-sm" 
              style={{ height: "150px", objectFit: "cover", display: "block" }}
              onError={(e) => e.target.style.display = 'none'}
            />
            <button
              type="button"
              className="btn btn-danger btn-sm position-absolute top-0 end-0 m-1 rounded-circle p-0 d-flex align-items-center justify-content-center"
              style={{ width: "24px", height: "24px" }}
              onClick={() => onChange("")}
              title="Xóa ảnh"
            >
              <FaTimes size={12} />
            </button>
          </div>
        ) : (
          <div 
            className="border rounded p-4 text-center bg-light" 
            style={{ borderStyle: "dashed", cursor: "pointer", transition: "all 0.2s" }}
            onClick={() => document.getElementById("file-input").click()}
            onMouseOver={(e) => e.currentTarget.style.borderColor = "#d63384"}
            onMouseOut={(e) => e.currentTarget.style.borderColor = "#dee2e6"}
          >
            {uploading ? (
              <div className="text-primary">
                <FaSpinner className="fa-spin fs-3 mb-2" />
                <p className="mb-0 small">Đang tải lên...</p>
              </div>
            ) : (
              <div className="text-muted">
                <FaCloudUploadAlt className="fs-2 mb-2" />
                <p className="mb-0 small">Nhấn để chọn ảnh</p>
              </div>
            )}
          </div>
        )}

        <input 
          type="file" 
          id="file-input" 
          accept="image/*" 
          onChange={handleFileChange} 
          style={{ display: "none" }} 
        />

        {!uploading && (
            <input 
                type="text" 
                className="form-control form-control-sm mt-1"
                placeholder="Hoặc dán đường dẫn ảnh tại đây..."
                value={value || ""}
                onChange={(e) => onChange(e.target.value)}
                style={{fontSize: '0.85rem'}}
            />
        )}
      </div>
    </div>
  );
}