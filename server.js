const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const app = express();

const PORT = process.env.PORT || 3000;

const PUBLIC_DIR = path.join(__dirname, "public");
const UPLOAD_DIR = path.join(__dirname, "uploads");
const DATA_FILE = path.join(__dirname, "videos.json");


// إنشاء المجلدات والملفات المطلوبة
if (!fs.existsSync(PUBLIC_DIR)) {
    fs.mkdirSync(PUBLIC_DIR, { recursive: true });
}

if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, "[]", "utf8");
}


// السماح بقراءة الملفات
app.use(express.json());

app.use(express.static(PUBLIC_DIR));

app.use("/uploads", express.static(UPLOAD_DIR));


// إعداد رفع الفيديو
const storage = multer.diskStorage({

    destination: function (req, file, cb) {
        cb(null, UPLOAD_DIR);
    },

    filename: function (req, file, cb) {

        const extension =
            path.extname(file.originalname).toLowerCase();

        const uniqueName =
            Date.now() +
            "-" +
            Math.random()
                .toString(36)
                .substring(2, 10) +
            extension;

        cb(null, uniqueName);
    }
});


const upload = multer({

    storage: storage,

    limits: {
        fileSize: 5 * 1024 * 1024 * 1024
    },

    fileFilter: function (req, file, cb) {

        if (file.mimetype.startsWith("video/")) {
            cb(null, true);
        } else {
            cb(new Error("يسمح برفع ملفات الفيديو فقط"));
        }
    }
});


// قراءة بيانات الفيديوهات
function getVideos() {

    try {

        const data =
            fs.readFileSync(
                DATA_FILE,
                "utf8"
            );

        return JSON.parse(data);

    } catch (error) {

        return [];

    }
}


// حفظ بيانات الفيديوهات
function saveVideos(videos) {

    fs.writeFileSync(
        DATA_FILE,
        JSON.stringify(
            videos,
            null,
            2
        ),
        "utf8"
    );

}


// رفع فيديو
app.post(
    "/api/upload",
    upload.single("video"),
    function (req, res) {

        try {

            if (!req.file) {

                return res.status(400).json({
                    message: "لم يتم اختيار فيديو"
                });

            }


            const title =
                String(
                    req.body.title || ""
                ).trim();


            const description =
                String(
                    req.body.description || ""
                ).trim();


            const video = {

                id:
                    Date.now().toString(),

                title:
                    title ||
                    req.file.originalname,

                description:
                    description,

                filename:
                    req.file.filename,

                originalName:
                    req.file.originalname,

                size:
                    req.file.size,

                mimetype:
                    req.file.mimetype,

                url:
                    "/uploads/" +
                    encodeURIComponent(
                        req.file.filename
                    ),

                createdAt:
                    new Date().toISOString()

            };


            const videos =
                getVideos();


            videos.unshift(video);


            saveVideos(videos);


            res.json({

                success: true,

                message:
                    "تم رفع الفيديو بنجاح",

                video:
                    video

            });

        } catch (error) {

            console.error(error);

            res.status(500).json({

                message:
                    "حدث خطأ أثناء رفع الفيديو"

            });

        }

    }
);


// جلب جميع الفيديوهات
app.get(
    "/api/videos",
    function (req, res) {

        const videos =
            getVideos();

        res.json(videos);

    }
);


// حذف فيديو
app.delete(
    "/api/videos/:id",
    function (req, res) {

        try {

            const id =
                req.params.id;


            const videos =
                getVideos();


            const video =
                videos.find(
                    item => item.id === id
                );


            if (!video) {

                return res.status(404).json({

                    message:
                        "الفيديو غير موجود"

                });

            }


            const filePath =
                path.join(
                    UPLOAD_DIR,
                    video.filename
                );


            if (fs.existsSync(filePath)) {

                fs.unlinkSync(filePath);

            }


            const newVideos =
                videos.filter(
                    item => item.id !== id
                );


            saveVideos(newVideos);


            res.json({

                success: true,

                message:
                    "تم حذف الفيديو"

            });

        } catch (error) {

            console.error(error);

            res.status(500).json({

                message:
                    "تعذر حذف الفيديو"

            });

        }

    }
);


// التعامل مع أخطاء رفع الملفات
app.use(function (err, req, res, next) {

    console.error(err);


    if (err instanceof multer.MulterError) {

        if (err.code === "LIMIT_FILE_SIZE") {

            return res.status(413).json({

                message:
                    "حجم الفيديو أكبر من الحد المسموح"

            });

        }

    }


    res.status(400).json({

        message:
            err.message ||
            "حدث خطأ أثناء رفع الملف"

    });

});


// تشغيل السيرفر
app.listen(
    PORT,
    "0.0.0.0",
    function () {

        console.log(
            "Video server running on port " +
            PORT
        );

        console.log(
            "http://localhost:" +
            PORT
        );

    }
);
