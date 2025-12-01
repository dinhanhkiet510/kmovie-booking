import React, { useMemo, useRef, useContext, useCallback } from 'react';
import ReactQuill from 'react-quill-new'; 
import 'react-quill-new/dist/quill.snow.css'; 
import axios from 'axios';
import { AuthContext } from '../../Context/AuthContext'; 
import '../AdminCSS/RichTextEditor.css'; 

export default function RichTextEditor({ value, onChange, placeholder }) {
  const quillRef = useRef(null);
  const { accessToken } = useContext(AuthContext);

  // --- Xử lý Upload ảnh ---
  const imageHandler = useCallback(() => {
    const input = document.createElement('input');
    input.setAttribute('type', 'file');
    input.setAttribute('accept', 'image/*');
    input.click();

    input.onchange = async () => {
      const file = input.files[0];
      if (!file) return;

      const formData = new FormData();
      formData.append('image', file);
      formData.append('folder', 'blog_content'); 

      try {
        const res = await axios.post("http://localhost:5000/api/upload", formData, {
            headers: { 
                "Content-Type": "multipart/form-data",
                "Authorization": `Bearer ${accessToken}`
            },
        });

        // --- TỐI ƯU HÓA ẢNH TRƯỚC KHI CHÈN ---
        // Thay vì lấy URL gốc, ta chèn thêm tham số transform của Cloudinary
        // w_1000: Giới hạn chiều rộng tối đa 1000px (để ảnh không quá to)
        // c_limit: Giữ tỷ lệ ảnh
        // q_auto: Tự động tối ưu chất lượng
        // f_auto: Tự động chọn định dạng (webp/jpg...)
        const originalUrl = res.data.url;
        const optimizedUrl = originalUrl.replace('/upload/', '/upload/w_1000,c_limit,q_auto,f_auto/');
        
        const quill = quillRef.current.getEditor();
        const range = quill.getSelection();
        quill.insertEmbed(range.index, 'image', optimizedUrl);

      } catch (err) {
        console.error("Lỗi upload ảnh editor:", err);
        alert("Không thể upload ảnh. Vui lòng thử lại!");
      }
    };
  }, [accessToken]);

  const modules = useMemo(() => ({
    toolbar: {
      container: [
        [{ 'header': [1, 2, 3, false] }],
        ['bold', 'italic', 'underline', 'strike'],        
        [{ 'list': 'ordered'}, { 'list': 'bullet' }],     
        [{ 'align': [] }],                                
        ['link', 'image', 'video'],                       
        ['clean']                                         
      ],
      handlers: {
        image: imageHandler 
      }
    }
  }), [imageHandler]);

  return (
    <div className="rich-editor-wrapper">
      <ReactQuill 
        ref={quillRef}
        theme="snow"
        value={value}
        onChange={onChange}
        modules={modules}
        placeholder={placeholder || "Viết nội dung tại đây..."}
      />
    </div>
  );
}