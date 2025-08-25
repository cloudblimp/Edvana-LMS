import {clerkClient} from '@clerk/express'
import Course from '../models/Course.js'
import { v2 as cloudinary} from 'cloudinary'
import { Purchase } from '../models/Purchase.js'
// Update role to educator
export const updateRoleToEducator = async(req, res)=>{
    try {
        const userId = req.auth.userId
        await clerkClient.users.updateUserMetadata(userId, {
            publicMetadata:{
                role: 'educator',

            }
        })

        res.json({success: true, message: 'You can publish a course now!'})

    } catch (error) {
        res.json({success: false, message: error.message})
    }


}

// Add new Course
export const addCourse = async (req, res) => {
    try {
        const { courseData } = req.body;
        const imageFile = req.file;
        const educatorId = req.auth.userId;

        // 1. Validate that the image file exists first.
        if (!imageFile) {
            return res.status(400).json({ success: false, message: "Thumbnail image is required." });
        }

        // 2. Upload to Cloudinary *before* touching the database.
        const imageUpload = await cloudinary.uploader.upload(imageFile.path, {
            folder: 'courses', // Optional: organize uploads in Cloudinary
            resource_type: 'image'
        });

        // 3. Prepare the complete course object.
        const parsedCourseData = JSON.parse(courseData);
        
        const coursePayload = {
            ...parsedCourseData, // Spread all data from the client
            educator: educatorId,
            courseThumbnail: imageUpload.secure_url, // Add the URL from Cloudinary
        };

        // 4. Create the course in the database in a single operation.
        const newCourse = await Course.create(coursePayload);

        res.status(201).json({ success: true, message: 'Course added successfully!', course: newCourse });

    } catch (error) {
        // Use a 500 status code for unexpected server errors.
        console.error("Error adding course:", error); // Log the full error for debugging
        res.status(500).json({ success: false, message: "An unexpected error occurred." });
    }
};

// Get Educator courses
export const getEducatorCourses = async(req, res)=>{
    try {
        const educator = req.auth.userId
        const courses = await Course.find({educator})
        res.json({success: true, courses})
    } catch (error) {
        res.json({success: false, message: error.message})
    }
}

// Get Educator Dashboard Data (Total earning, enrolled students, no of courses)
export const educatorDashboardData = async ()=>{
    try {
        const educator = req.auth.userId
        const courses = await Course.find({educator})
        const totalCourses = courses.length
        const courseIds = courses.map(course => course._id)

        //calculate total earnings from purchase
        const purchases = await Purchase.find({
            courseId: {$in: courseIds},
            status: 'completed'
        })

        const totalEarnings = purchases.reduce((sum, purchase)=>sum + purchase.amount, 0)

        //Collect unique enrolled student IDs with their course titles
        const enrolledStudentsData = [];
        for(const course of courses){
            const students = await User.find({
                _id: {$in: course.enrolledStudents}
            }, 'name imageUrl')
            students.forEach(student =>{
                enrolledStudentsData.push({
                    courseTitle: course.courseTitle,
                    student
                })
            })
            
            res.json({success: true, dashboardData:{
                totalEarnings, enrolledStudentsData, totalCourses
            }})
        }
    } catch (error) {
        res.json({success: false, message: error.message})
    }
}
// Get Enrolled Students Data with purchase data
export const getEnrolledStudentsData = async(req,res) =>{
    try {
        const educator = req.auth.userId;
        const courses = await Course.find({educator})
        const courseIds = courses.map(course => course._id)

        const purchases = await Purchase.find({
            courseId: {$in: courseIds},
            status: 'completed'
        }).populate('userId', 'name imageUrl').populate('courseId', 'courseTitle')

        const enrolledStudents = purchases.map(purchase => ({
            student: purchase.userId,
            courseTitle: purchase.courseId.courseTitle,
            purchaseDate: purchase.createdAt
        }));

        res.json({success: true, enrolledStudents});

    } catch (error) {
        res.json({success: false, message:error.message})
    }
}