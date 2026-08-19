import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { toast } from 'react-hot-toast';
import { Lock, User, GraduationCap, ArrowLeft } from 'lucide-react';
import { Button, Input, Card } from '../../components/ui';
import { useAuthStore } from '../../store/authStore';
import db from '../../services/database';

interface LoginFormData {
  username: string;
  password: string;
}

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>();

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    try {
      const result = await db.authenticate(data.username, data.password);

      if (result) {
        login(result.user);
        toast.success(`خوش آمدید ${result.user.fullName}`);
        
        // Redirect based on role
        switch (result.role) {
          case 'admin':
            navigate('/admin');
            break;
          case 'teacher':
            navigate('/teacher');
            break;
          case 'consultant':
            navigate('/consultant');
            break;
          case 'parent':
            navigate('/parent');
            break;
          case 'student':
            navigate('/student');
            break;
          default:
            navigate('/');
        }
      } else {
        toast.error('نام کاربری یا رمز عبور نادرست است');
      }
    } catch (error) {
      toast.error('خطا در ورود به سیستم');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-dark-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-primary-600/20 rounded-3xl mb-4">
            <GraduationCap className="w-10 h-10 text-primary-400" />
          </div>
          <h1 className="text-3xl font-bold text-dark-100">سامانه هوشمند مدارس</h1>
          <p className="text-dark-400 mt-2">School Intelligence Platform</p>
        </div>

        <Card className="animate-fade-in">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <Input
              label="نام کاربری"
              placeholder="نام کاربری خود را وارد کنید"
              icon={<User className="w-5 h-5" />}
              error={errors.username?.message}
              {...register('username', {
                required: 'نام کاربری الزامی است',
              })}
            />

            <Input
              label="رمز عبور"
              type="password"
              placeholder="رمز عبور خود را وارد کنید"
              icon={<Lock className="w-5 h-5" />}
              error={errors.password?.message}
              {...register('password', {
                required: 'رمز عبور الزامی است',
              })}
            />

            <Button
              type="submit"
              className="w-full"
              size="lg"
              loading={isLoading}
              icon={<ArrowLeft className="w-5 h-5" />}
            >
              ورود به سیستم
            </Button>
          </form>
        </Card>

        {/* Features */}
        <div className="mt-8 grid grid-cols-3 gap-4">
          <div className="text-center p-4 bg-dark-900/50 rounded-xl">
            <div className="text-2xl mb-2">🎓</div>
            <p className="text-dark-400 text-xs">مدیریت هوشمند</p>
          </div>
          <div className="text-center p-4 bg-dark-900/50 rounded-xl">
            <div className="text-2xl mb-2">📊</div>
            <p className="text-dark-400 text-xs">تحلیل پیشرفته</p>
          </div>
          <div className="text-center p-4 bg-dark-900/50 rounded-xl">
            <div className="text-2xl mb-2">🤖</div>
            <p className="text-dark-400 text-xs">هوش مصنوعی</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
